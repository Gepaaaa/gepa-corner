// @ts-nocheck
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { memoryTransactions, saveTransactionsToDisk } from "./transactions.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, "../data/users.json");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dkybfxbhlwyrjcycpatp.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory fallback database for local/offline resilience
export const memoryUsers = new Map();
// Temporary OTP store for self-service password reset
export const resetOtps = new Map();

// Load initial users from disk if available
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const u of arr) {
        if (u && u.id) {
          memoryUsers.set(u.id, u);
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load users from disk:", e.message);
}

export function saveUsersToDisk() {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(memoryUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save users to disk:", e.message);
  }
}

// Helper to hash password
function hashPassword(password) {
  return crypto.createHash("sha256").update(`GEPA_SALT_${password}`).digest("hex");
}

// Generate simple auth token
function createToken(userId) {
  return crypto.createHmac("sha256", process.env.MIDTRANS_SERVER_KEY || "gepa-secret-key")
    .update(`USER:${userId}:${Date.now()}`)
    .digest("hex");
}

export default async function handler(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  const action = req.query.action || (req.body && req.body.action) || "login";

  try {
    // ==========================================
    // ACTION: ME / GET CURRENT USER SESSION (SYNC)
    // ==========================================
    if ((action === "me" || action === "get-profile") && (req.method === "GET" || req.method === "POST")) {
      const authHeader = req.headers.authorization;
      const queryUserId = req.query.userId || req.body?.userId;
      const queryUsername = (req.query.username || req.body?.username || "").trim().toLowerCase().replace(/^@/, "");
      let targetUser = null;

      if (queryUserId) {
        targetUser = memoryUsers.get(queryUserId);
      }

      if (!targetUser && queryUsername) {
        for (const [_, u] of memoryUsers.entries()) {
          if (u.username?.toLowerCase() === queryUsername) {
            targetUser = u;
            break;
          }
        }
      }

      if (!targetUser && authHeader) {
        const token = authHeader.replace("Bearer ", "").trim();
        for (const [_, u] of memoryUsers.entries()) {
          if (u.id === token || u.lastToken === token) {
            targetUser = u;
            break;
          }
        }
      }

      // Selalu cek database Supabase untuk mendapatkan avatar dan profil terupdate (sinkronisasi antar web/perangkat)
      if (SUPABASE_SERVICE_ROLE && (queryUsername || targetUser || queryUserId)) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const cleanName = (targetUser ? targetUser.username : queryUsername).toLowerCase();

          // 1. Ambil data profil dari profiles table (Sumber Utama Akurat)
          let profAvatar = null;
          if (cleanName) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("*")
              .ilike("username", cleanName)
              .maybeSingle();

            if (prof) {
              profAvatar = prof.avatar_url;
              if (!targetUser) {
                targetUser = {
                  id: prof.id,
                  email: `${prof.username}@gepacorner.my.id`,
                  username: prof.username,
                  phone: prof.phone || "",
                  bio: "Sahabat Corner",
                  createdAt: prof.updated_at,
                  avatar: prof.avatar_url || "👤"
                };
              } else {
                if (!targetUser.id) targetUser.id = prof.id;
                if (prof.phone) targetUser.phone = prof.phone;
              }
            }
          }

          // 2. Ambil avatar dari record donations (AVATAR_USER_*) sebagai fallback emoji jika profiles kosong
          let donAvatar = null;
          if (cleanName) {
            const { data: avRow } = await supabase
              .from("donations")
              .select("status")
              .eq("order_id", `AVATAR_USER_${cleanName}`)
              .maybeSingle();

            if (avRow && avRow.status && avRow.status.startsWith("AVATAR_DATA:")) {
              donAvatar = avRow.status.slice("AVATAR_DATA:".length);
            }
          }

          // Resolusi avatar terbaik: Foto profil asli (data:image / http) selalu menang di atas emoji default
          const resolvedAvatar = (profAvatar && (profAvatar.startsWith("data:image") || profAvatar.startsWith("http")))
            ? profAvatar
            : (donAvatar && (donAvatar.startsWith("data:image") || donAvatar.startsWith("http")))
            ? donAvatar
            : (profAvatar || donAvatar || targetUser?.avatar || "👤");

          if (targetUser) {
            targetUser.avatar = resolvedAvatar;
          } else if (cleanName) {
            targetUser = {
              username: cleanName,
              avatar: resolvedAvatar,
              bio: "Sahabat Corner"
            };
          }
        } catch (sbErr) {
          console.warn("Supabase me sync fallback warning:", sbErr.message);
        }
      }

      if (targetUser) {
        return res.status(200).json({
          user: {
            id: targetUser.id || queryUserId,
            email: targetUser.email,
            username: targetUser.username,
            avatar: targetUser.avatar || "👤",
            phone: targetUser.phone || "",
            bio: targetUser.bio || "",
            createdAt: targetUser.createdAt
          }
        });
      }

      return res.status(401).json({ error: "Sesi tidak ditemukan atau kedaluwarsa." });
    }

    // ==========================================
    // ACTION: REGISTER
    // ==========================================
    if (action === "register" && req.method === "POST") {
      const { email, username, password, avatar, phone } = req.body || {};

      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Email tidak valid." });
      }

      const cleanUsername = String(username || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!cleanUsername || cleanUsername.length < 3) {
        return res.status(400).json({ error: "Username minimal 3 karakter (huruf, angka, _)." });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password minimal 6 karakter." });
      }

      // Check if username already exists in memory
      for (const [_, u] of memoryUsers.entries()) {
        if (u.username === cleanUsername) {
          return res.status(400).json({ error: "Username sudah dipakai oleh orang lain." });
        }
        if (u.email === email.toLowerCase()) {
          return res.status(400).json({ error: "Email sudah terdaftar. Silakan login." });
        }
      }

      let userId = "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

      // Coba register di Supabase jika aktif
      if (SUPABASE_SERVICE_ROLE) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const { data: sbUser, error: sbError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username: cleanUsername, avatar_url: avatar || "🐱" }
          });

          if (!sbError && sbUser && sbUser.user) {
            userId = sbUser.user.id;
            await supabase.from("profiles").upsert({
              id: userId,
              username: cleanUsername,
              avatar_url: avatar || "🐱",
              phone: phone || ""
            });

            await supabase.from("donations").upsert({
              order_id: `USER_MAP_${cleanUsername}`,
              username: cleanUsername,
              amount: 0,
              status: `USER_EMAIL:${email.toLowerCase()}`,
              transaction_time: new Date().toISOString()
            }, { onConflict: "order_id" });
          }
        } catch (sbErr) {
          console.warn("Supabase registration fallback:", sbErr.message);
        }
      }

      const token = createToken(userId);
      const newUser = {
        id: userId,
        email: email.toLowerCase(),
        username: cleanUsername,
        passwordHash: hashPassword(password),
        avatar: avatar || "🐱",
        phone: phone || "",
        bio: "Sahabat Corner",
        createdAt: new Date().toISOString(),
        lastToken: token
      };
      memoryUsers.set(userId, newUser);
      saveUsersToDisk();

      return res.status(200).json({
        message: "Pendaftaran berhasil!",
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          avatar: newUser.avatar,
          phone: newUser.phone,
          bio: newUser.bio,
          createdAt: newUser.createdAt
        }
      });
    }

    // ==========================================
    // ACTION: LOGIN
    // ==========================================
    if (action === "login" && req.method === "POST") {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({ error: "Email/Username dan Password wajib diisi." });
      }

      const cleanId = String(identifier).trim().toLowerCase();
      const pwdHash = hashPassword(password);

      // 1. Check in memory database first
      let matchedUser = null;
      for (const [_, u] of memoryUsers.entries()) {
        if ((u.email === cleanId || u.username === cleanId) && u.passwordHash === pwdHash) {
          matchedUser = u;
          break;
        }
      }

      // 2. Try Supabase if not matched in memory
      if (!matchedUser && SUPABASE_SERVICE_ROLE) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          let loginEmail = cleanId;

          // If not email, look up email by username
          if (!cleanId.includes("@")) {
            const { data: userMap } = await supabase
              .from("donations")
              .select("status")
              .eq("order_id", `USER_MAP_${cleanId}`)
              .maybeSingle();
            if (userMap?.status && userMap.status.startsWith("USER_EMAIL:")) {
              loginEmail = userMap.status.slice("USER_EMAIL:".length).trim().toLowerCase();
            } else {
              const { data: prof } = await supabase.from("profiles").select("id").eq("username", cleanId).maybeSingle();
              if (prof) {
                for (const [_, u] of memoryUsers.entries()) {
                  if (u.id === prof.id && u.email && u.email.includes("@")) {
                    loginEmail = u.email;
                    break;
                  }
                }
              }
            }
          }

          // Try sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password
          });

          if (!signInError && signInData && signInData.user) {
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", signInData.user.id).single();
            const sessionAccessToken = signInData?.session?.access_token || null;
            matchedUser = {
              id: signInData.user.id,
              email: signInData.user.email,
              username: profile?.username || cleanId.replace(/[^a-z0-9_]/g, ""),
              avatar: profile?.avatar_url || "🐱",
              phone: profile?.phone || "",
              bio: "Sahabat Corner",
              createdAt: signInData.user.created_at,
              accessToken: sessionAccessToken
            };
            memoryUsers.set(matchedUser.id, { ...matchedUser, passwordHash: pwdHash });
            saveUsersToDisk();
          }
        } catch (sbErr) {
          console.warn("Supabase sign in fallback:", sbErr.message);
        }
      }

      if (!matchedUser) {
        return res.status(401).json({ error: "Email/Username atau password salah." });
      }

      // 3. Ambil avatar persisten dari Supabase jika ada (dari AVATAR_USER_* atau profiles)
      if (SUPABASE_SERVICE_ROLE && matchedUser) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const cleanUser = matchedUser.username.toLowerCase();
          
          // A. Cek dari profiles table terlebih dahulu (Primary)
          let profAvatar = null;
          const { data: prof } = await supabase
            .from("profiles")
            .select("avatar_url, phone")
            .ilike("username", cleanUser)
            .maybeSingle();
          if (prof && prof.avatar_url) {
            profAvatar = prof.avatar_url;
            if (prof.phone && !matchedUser.phone) matchedUser.phone = prof.phone;
          }

          // B. Cek dari record donasi AVATAR_USER_* sebagai fallback
          let donAvatar = null;
          const { data: avRow } = await supabase
            .from("donations")
            .select("status")
            .eq("order_id", `AVATAR_USER_${cleanUser}`)
            .maybeSingle();

          if (avRow && avRow.status && avRow.status.startsWith("AVATAR_DATA:")) {
            donAvatar = avRow.status.slice("AVATAR_DATA:".length);
          }

          const resolvedAvatar = (profAvatar && (profAvatar.startsWith("data:image") || profAvatar.startsWith("http")))
            ? profAvatar
            : (donAvatar && (donAvatar.startsWith("data:image") || donAvatar.startsWith("http")))
            ? donAvatar
            : (profAvatar || donAvatar || matchedUser.avatar || "🐱");

          matchedUser.avatar = resolvedAvatar;

          // C. Simpan relasi email dan username agar pemulihan OTP selalu akurat
          if (matchedUser.email) {
            await supabase.from("donations").upsert({
              order_id: `USER_MAP_${cleanUser}`,
              username: cleanUser,
              amount: 0,
              status: `USER_EMAIL:${matchedUser.email.toLowerCase()}`,
              transaction_time: new Date().toISOString()
            }, { onConflict: "order_id" });
          }
        } catch (avErr) {
          console.warn("Avatar login restore fallback:", avErr.message);
        }
      }

      const token = createToken(matchedUser.id);
      matchedUser.lastToken = token;
      saveUsersToDisk();

      return res.status(200).json({
        message: "Berhasil masuk!",
        token,
        accessToken: matchedUser.accessToken || token,
        user: {
          id: matchedUser.id,
          email: matchedUser.email,
          username: matchedUser.username,
          avatar: matchedUser.avatar || "🐱",
          phone: matchedUser.phone || "",
          bio: matchedUser.bio || "",
          createdAt: matchedUser.createdAt
        }
      });
    }

    // ==========================================
    // ACTION: REQUEST PASSWORD RESET VIA SUPABASE
    // ==========================================
    if ((action === "request-reset-otp" || action === "request-reset-password") && req.method === "POST") {
      const { identifier } = req.body || {};
      if (!identifier) {
        return res.status(400).json({ error: "Email atau Username wajib diisi." });
      }

      const cleanId = String(identifier).trim().toLowerCase();
      let targetUser = null;
      let targetEmail = null;

      // 1. Cek di database memory lokal
      for (const [_, u] of memoryUsers.entries()) {
        if (u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId) {
          targetUser = u;
          if (u.email && u.email.includes("@") && !u.email.endsWith("@gepacorner.my.id")) {
            targetEmail = u.email.toLowerCase();
          }
          break;
        }
      }

      // 2. Validasi pendaftaran dan resolusi targetEmail
      if (SUPABASE_SERVICE_ROLE) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          
          if (cleanId.includes("@")) {
            targetEmail = cleanId;

            // Cari profil yang mungkin cocok dengan email ini
            const prefix = cleanId.split("@")[0].replace(/[^a-z0-9_]/g, "");
            const { data: prof } = await supabase.from("profiles").select("*").ilike("username", prefix).maybeSingle();
            if (prof && !targetUser) {
              targetUser = {
                id: prof.id,
                email: cleanId,
                username: prof.username,
                avatar: prof.avatar_url || "👤"
              };
            }
          } else {
            // Identifier adalah username: Cari email yang terhubung dengan username ini
            const lookupKey = cleanId.replace(/^@/, "");

            // A. Cari email dari relasi donations (USER_MAP_*)
            const { data: userMap } = await supabase
              .from("donations")
              .select("status")
              .eq("order_id", `USER_MAP_${lookupKey}`)
              .maybeSingle();

            if (userMap?.status && userMap.status.startsWith("USER_EMAIL:")) {
              targetEmail = userMap.status.slice("USER_EMAIL:".length).trim().toLowerCase();
            }

            // B. Cek profiles table
            const { data: prof } = await supabase.from("profiles").select("id, username, avatar_url, phone").ilike("username", lookupKey).maybeSingle();
            if (!prof && !targetUser && !targetEmail) {
              return res.status(404).json({
                error: `Username @${cleanId} tidak terdaftar di Gepa Corner.`
              });
            }

            if (prof) {
              if (!targetUser) {
                targetUser = {
                  id: prof.id,
                  email: targetEmail || "",
                  username: prof.username,
                  avatar: prof.avatar_url || "👤",
                  phone: prof.phone || ""
                };
              } else {
                targetUser.id = prof.id;
              }
            }

            if (!targetEmail && targetUser && targetUser.email && targetUser.email.includes("@")) {
              targetEmail = targetUser.email.toLowerCase();
            }

            if (!targetEmail) {
              return res.status(404).json({
                error: `Email untuk akun @${cleanId} belum tertaut. Silakan masukkan alamat email yang kamu daftarkan.`
              });
            }
          }
        } catch (e) {
          console.warn("Supabase lookup error for reset password:", e.message);
        }
      }

      if (!targetEmail || !targetEmail.includes("@")) {
        return res.status(404).json({
          error: "Akun dengan email atau username tersebut tidak terdaftar di Gepa Corner."
        });
      }

      // Sinkronkan email targetUser di database lokal
      if (targetUser) {
        targetUser.email = targetEmail;
        memoryUsers.set(targetUser.id, targetUser);
        saveUsersToDisk();
      }

      // 3. Kirim email pemulihan resmi menggunakan template "Reset Password" Supabase
      let supabaseSent = false;
      const rawOrigin = req.headers.origin || req.headers.referer || "";
      let appOrigin = "https://www.gepacorner.my.id";
      if (rawOrigin) {
        try {
          const parsed = new URL(rawOrigin);
          appOrigin = `${parsed.protocol}//${parsed.host}`;
        } catch (e) {}
      }

      if (SUPABASE_SERVICE_ROLE) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
            redirectTo: `${appOrigin}/#type=recovery`
          });
          if (!resetErr) {
            supabaseSent = true;
          } else {
            console.warn("Supabase auth resetPasswordForEmail warning:", resetErr.message);
          }
        } catch (sbErr) {
          console.warn("Supabase auth reset error:", sbErr.message);
        }
      }

      // Simpan session reset dan kode verifikasi ke memory store
      const secureOtp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const resetEntry = {
        code: secureOtp,
        expiresAt,
        userId: targetUser?.id || null,
        email: targetEmail,
        username: targetUser?.username || cleanId
      };

      resetOtps.set(cleanId, resetEntry);
      resetOtps.set(targetEmail.toLowerCase(), resetEntry);
      if (targetUser?.id) {
        resetOtps.set(targetUser.id, resetEntry);
      }

      // Mask email for privacy (e.g. r***a@gmail.com)
      const [localPart, domainPart] = targetEmail.split("@");
      const maskedLocal = localPart.length > 2 
        ? localPart[0] + "***" + localPart.slice(-1)
        : localPart[0] + "***";
      const maskedEmail = `${maskedLocal}@${domainPart || "mail.com"}`;

      return res.status(200).json({
        success: true,
        message: `Instruksi dan kode pemulihan kata sandi resmi telah dikirim ke email ${maskedEmail}.`,
        maskedEmail,
        targetEmail,
        email: targetEmail,
        identifier: cleanId,
        username: targetUser?.username || cleanId,
        supabaseSent,
        userId: targetUser?.id || null
      });
    }

    // ==========================================
    // ACTION: VERIFY RESET PASSWORD / UPDATE VIA RECOVERY
    // ==========================================
    if ((action === "verify-reset-password" || action === "verify-reset-otp" || action === "update-recovery-password" || action === "reset-password") && req.method === "POST") {
      const { identifier, email, code, otp, token, newPassword, password, accessToken } = req.body || {};
      const targetPassword = newPassword || password;
      if (!targetPassword || targetPassword.length < 6) {
        return res.status(400).json({ error: "Password baru minimal 6 karakter." });
      }

      // Direct update via recovery accessToken from Supabase
      if (accessToken && SUPABASE_SERVICE_ROLE) {
        let accessUpdated = false;
        try {
          const restResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_SERVICE_ROLE,
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({ password: targetPassword })
          });
          if (restResp.ok) {
            accessUpdated = true;
          }
        } catch (e) {
          console.warn("Direct updateUser via accessToken error:", e.message);
        }

        if (!accessUpdated) {
          try {
            const userSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
            await userSb.auth.setSession({ access_token: accessToken, refresh_token: "" });
            const { error: updErr } = await userSb.auth.updateUser({ password: targetPassword });
            if (!updErr) accessUpdated = true;
          } catch (e) {
            console.warn("SDK updateUser via accessToken error:", e.message);
          }
        }

        if (accessUpdated) {
          const cleanId = String(identifier || email || "").trim().toLowerCase();
          for (const [_, u] of memoryUsers.entries()) {
            if (u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId) {
              u.passwordHash = hashPassword(targetPassword);
              saveUsersToDisk();
              break;
            }
          }
          return res.status(200).json({
            success: true,
            message: "Password berhasil diperbarui! Silakan masuk dengan kata sandi baru kamu. 🔐"
          });
        }
      }

      const rawCode = String(code || otp || token || "").trim();
      const cleanCode = rawCode.replace(/[\s-]+/g, "");

      if (!cleanCode) {
        return res.status(400).json({ error: "Kode verifikasi 6-digit wajib diisi." });
      }

      const cleanId = String(identifier || "").trim().toLowerCase();
      let targetEmail = String(email || "").trim().toLowerCase();
      let targetUser = null;

      // 1. Cek di resetOtps map
      if (cleanId && resetOtps.has(cleanId)) {
        const stored = resetOtps.get(cleanId);
        if (stored?.email) targetEmail = stored.email.toLowerCase();
      }

      // 2. Cek database lokal
      for (const [_, u] of memoryUsers.entries()) {
        if (u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId) {
          targetUser = u;
          if (!targetEmail && u.email && u.email.includes("@") && !u.email.endsWith("@gepacorner.my.id")) {
            targetEmail = u.email.toLowerCase();
          }
          break;
        }
      }

      if (cleanId.includes("@") && !targetEmail) {
        targetEmail = cleanId;
      }

      // 3. Supabase lookup untuk username -> email jika targetEmail masih kosong
      if (SUPABASE_SERVICE_ROLE && (!targetEmail || !targetEmail.includes("@"))) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const lookupKey = cleanId.replace(/^@/, "");

          const { data: userMap } = await supabase
            .from("donations")
            .select("status")
            .eq("order_id", `USER_MAP_${lookupKey}`)
            .maybeSingle();

          if (userMap?.status && userMap.status.startsWith("USER_EMAIL:")) {
            targetEmail = userMap.status.slice("USER_EMAIL:".length).trim().toLowerCase();
          }

          if (!targetEmail) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("id, username")
              .ilike("username", lookupKey)
              .maybeSingle();
            if (prof && targetUser) {
              targetUser.id = prof.id;
            }
          }
        } catch (sbLookupErr) {
          console.warn("Supabase lookup error during verify reset:", sbLookupErr.message);
        }
      }

      if (!targetEmail && cleanId.includes("@")) {
        targetEmail = cleanId;
      }

      let otpValid = false;
      let sessionToken = null;
      let verifiedSupabaseClient = null;

      // Kumpulan email kandidat untuk diverifikasi ke Supabase (hindari domain placeholder)
      const candidateEmails = Array.from(new Set([
        targetEmail,
        email,
        targetUser?.email,
        cleanId.includes("@") ? cleanId : null
      ].filter(e => e && typeof e === "string" && e.includes("@") && !e.toLowerCase().endsWith("@gepacorner.my.id"))
       .map(e => e.trim().toLowerCase())));

      // 1. Verifikasi kode OTP langsung ke Supabase Auth
      if (SUPABASE_SERVICE_ROLE && candidateEmails.length > 0) {
        const otpTypes = ["recovery", "email", "magiclink", "signup"];
        for (const vEmail of candidateEmails) {
          if (otpValid) break;

          for (const type of otpTypes) {
            if (otpValid) break;
            try {
              const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
              const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
                email: vEmail,
                token: cleanCode,
                type
              });
              if (!vErr && (vData?.user || vData?.session)) {
                otpValid = true;
                verifiedSupabaseClient = supabase;
                sessionToken = vData.session?.access_token || null;
                targetEmail = vEmail;
                if (targetUser && vData.user?.id) targetUser.id = vData.user.id;
                console.log(`Supabase verifyOtp succeeded for ${vEmail} with type ${type}`);
                break;
              }
            } catch (e) {
              // continue to next type
            }
          }

          // Coba token_hash jika input berbentuk hash / token link
          if (!otpValid && cleanCode.length > 8) {
            for (const type of ["recovery", "email"]) {
              if (otpValid) break;
              try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
                const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
                  token_hash: cleanCode,
                  type
                });
                if (!vErr && (vData?.user || vData?.session)) {
                  otpValid = true;
                  verifiedSupabaseClient = supabase;
                  sessionToken = vData.session?.access_token || null;
                  if (targetUser && vData.user?.id) targetUser.id = vData.user.id;
                  break;
                }
              } catch (e) {}
            }
          }
        }
      }

      // 2. Fallback memory OTP
      if (!otpValid) {
        const activeOtp = (targetUser && resetOtps.get(targetUser.id)) ||
                          (targetEmail && resetOtps.get(targetEmail.toLowerCase())) ||
                          (cleanId && resetOtps.get(cleanId.toLowerCase()));
        if (activeOtp && activeOtp.code === cleanCode && Date.now() <= activeOtp.expiresAt) {
          otpValid = true;
        }
      }

      if (!otpValid) {
        return res.status(400).json({
          error: "Kode verifikasi salah atau sudah kedaluwarsa. Silakan periksa kembali email Anda atau minta kode baru."
        });
      }

      // 3. Update password di Supabase Auth via verified session
      let sbPasswordUpdated = false;
      if (verifiedSupabaseClient) {
        try {
          const { error: updErr } = await verifiedSupabaseClient.auth.updateUser({ password: targetPassword });
          if (!updErr) {
            sbPasswordUpdated = true;
          } else {
            console.warn("verifiedSupabaseClient updateUser warning:", updErr.message);
          }
        } catch (sbErr) {
          console.warn("verifiedSupabaseClient updateUser exception:", sbErr.message);
        }
      }

      if (!sbPasswordUpdated && sessionToken && SUPABASE_SERVICE_ROLE) {
        try {
          const restResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_SERVICE_ROLE,
              "Authorization": `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ password: targetPassword })
          });
          if (restResp.ok) {
            sbPasswordUpdated = true;
          } else {
            console.warn("Direct updateUser status:", restResp.status);
          }
        } catch (sbErr) {
          console.warn("Supabase user update via session token error:", sbErr.message);
        }
      }

      // 4. Update password hash dan email di database lokal
      const newHash = hashPassword(targetPassword);
      let localUserFound = false;

      for (const [_, u] of memoryUsers.entries()) {
        if ((targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase()) ||
            (cleanId && u.username?.toLowerCase() === cleanId.toLowerCase()) ||
            (targetUser?.id && u.id === targetUser.id)) {
          u.passwordHash = newHash;
          if (targetEmail && targetEmail.includes("@")) u.email = targetEmail;
          localUserFound = true;
          break;
        }
      }

      if (!localUserFound && (targetEmail || cleanId)) {
        const newLocal = {
          id: targetUser?.id || `usr_${Date.now()}`,
          email: targetEmail || `${cleanId}@mail.com`,
          username: targetUser?.username || cleanId.replace(/[^a-z0-9_]/g, ""),
          passwordHash: newHash,
          avatar: targetUser?.avatar || "👤",
          phone: targetUser?.phone || "",
          bio: "Sahabat Corner",
          createdAt: new Date().toISOString()
        };
        memoryUsers.set(newLocal.id, newLocal);
      }
      saveUsersToDisk();

      // Invalidate OTP
      if (cleanId) resetOtps.delete(cleanId);
      if (targetEmail) resetOtps.delete(targetEmail.toLowerCase());
      if (targetUser?.id) resetOtps.delete(targetUser.id);

      return res.status(200).json({
        success: true,
        message: "Password berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda. 🔐"
      });
    }

    // ==========================================
    // ACTION: UPDATE PROFILE
    // ==========================================
    if (action === "update-profile" && req.method === "POST") {
      const { userId, username, avatar, phone, bio } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: "User ID diperlukan." });
      }

      const cleanUsername = String(username || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!cleanUsername || cleanUsername.length < 3) {
        return res.status(400).json({ error: "Username minimal 3 karakter (huruf, angka, _)." });
      }

      // Check if username taken by someone else
      for (const [id, u] of memoryUsers.entries()) {
        if (id !== userId && u.username === cleanUsername) {
          return res.status(400).json({ error: "Username sudah digunakan oleh akun lain." });
        }
      }

      let user = memoryUsers.get(userId);
      if (!user) {
        user = {
          id: userId,
          email: `${cleanUsername}@gepacorner.my.id`,
          username: cleanUsername,
          avatar: avatar || "🐱",
          phone: phone || "",
          bio: bio || "Sahabat Corner",
          createdAt: new Date().toISOString()
        };
      }

      const oldUsername = user.username;
      user.username = cleanUsername;
      if (avatar) user.avatar = avatar;
      if (phone !== undefined) user.phone = phone;
      if (bio !== undefined) user.bio = bio;
      memoryUsers.set(userId, user);
      saveUsersToDisk();

      // Cascade update to memoryTransactions so leaderboard and history stay synced
      let updatedTx = false;
      for (const [orderId, tx] of memoryTransactions.entries()) {
        if (tx && tx.username && (tx.username.toLowerCase() === oldUsername.toLowerCase() || tx.username.toLowerCase() === cleanUsername.toLowerCase())) {
          tx.username = cleanUsername;
          if (avatar) tx.avatar = avatar;
          updatedTx = true;
        }
      }
      if (updatedTx) {
        saveTransactionsToDisk();
      }

      // Sync ke Supabase jika aktif (sertakan bearer token jika dikirim oleh client)
      if (SUPABASE_SERVICE_ROLE && !userId.startsWith("demo_")) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

          // 1. Simpan ke profiles table (Primary source of truth untuk user & foto profil)
          try {
            let profileId = isValidUuid ? userId : null;
            if (!profileId) {
              const { data: pExist } = await supabase.from("profiles").select("id").ilike("username", cleanUsername).maybeSingle();
              if (pExist && pExist.id) profileId = pExist.id;
            }

            if (profileId) {
              await supabase.from("profiles").update({
                username: user.username,
                avatar_url: user.avatar,
                phone: user.phone || "",
                updated_at: new Date().toISOString()
              }).eq("id", profileId);
            } else {
              await supabase.from("profiles").upsert({
                username: user.username,
                avatar_url: user.avatar,
                phone: user.phone || "",
                updated_at: new Date().toISOString()
              }, { onConflict: "username" });
            }
          } catch (pErr) {
            console.warn("Supabase profiles update error:", pErr.message);
          }

          // 2. Untuk tabel donations: donations.status memiliki indeks b-tree PostgreSQL (maks 2704 byte).
          // Jika avatar adalah foto galeri (base64 besar), hapus record emoji lama di donations agar tidak menimpa foto profil.
          // Jika avatar adalah emoji biasa (pendek), barulah simpan ke donations sebagai cadangan.
          try {
            if (user.avatar && (user.avatar.startsWith("data:image") || user.avatar.length > 200)) {
              await supabase.from("donations").delete().eq("order_id", `AVATAR_USER_${cleanUsername}`);
            } else if (user.avatar) {
              await supabase.from("donations").upsert({
                order_id: `AVATAR_USER_${cleanUsername}`,
                username: cleanUsername,
                amount: 0,
                status: `AVATAR_DATA:${user.avatar}`,
                transaction_time: new Date().toISOString(),
                user_id: isValidUuid ? userId : null
              }, { onConflict: "order_id" });
            }
          } catch (dErr) {
            console.warn("Donations avatar sync fallback warning:", dErr.message);
          }
        } catch (e) {
          console.warn("Supabase update profile error:", e.message);
        }
      }

      return res.status(200).json({
        message: "Profil dan foto avatar berhasil diperbarui! ✨",
        user
      });
    }

    // ==========================================
    // ACTION: CHANGE PASSWORD
    // ==========================================
    if (action === "change-password" && req.method === "POST") {
      const { userId, oldPassword, newPassword } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: "User ID diperlukan." });
      }
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password baru minimal 6 karakter." });
      }

      let user = memoryUsers.get(userId);
      if (!user && SUPABASE_SERVICE_ROLE) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const { data: { user: sbUser } } = await supabase.auth.admin.getUserById(userId);
          if (sbUser) {
            user = {
              id: sbUser.id,
              email: sbUser.email,
              username: sbUser.user_metadata?.username || "user",
              passwordHash: "",
              avatar: sbUser.user_metadata?.avatar_url || "🐱"
            };
            memoryUsers.set(userId, user);
          }
        } catch (e) {}
      }

      if (!user) {
        return res.status(404).json({ error: "Akun pengguna tidak ditemukan." });
      }

      // Verifikasi password lama jika bukan guest dan memiliki password tersimpan
      if (!userId.startsWith("demo_") && user.passwordHash) {
        if (!oldPassword) {
          return res.status(400).json({ error: "Password lama wajib diisi." });
        }
        if (user.passwordHash !== hashPassword(oldPassword)) {
          return res.status(400).json({ error: "Password lama tidak sesuai." });
        }
      }

      // Set password baru
      user.passwordHash = hashPassword(newPassword);
      memoryUsers.set(userId, user);
      saveUsersToDisk();

      // Update di Supabase jika aktif
      if (SUPABASE_SERVICE_ROLE && !userId.startsWith("demo_")) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          await supabase.auth.admin.updateUserById(userId, { password: newPassword });
        } catch (sbErr) {
          console.warn("Supabase password update error:", sbErr.message);
        }
      }

      return res.status(200).json({
        message: "Password berhasil diubah! Gunakan password baru saat login berikutnya. 🔐"
      });
    }

    return res.status(400).json({ error: "Action tidak dikenal." });
  } catch (err) {
    console.error("Auth handler error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan internal server." });
  }
}
