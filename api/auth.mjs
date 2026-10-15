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

          // 1. Ambil avatar permanen dari record donations (AVATAR_USER_*)
          if (cleanName) {
            const { data: avRow } = await supabase
              .from("donations")
              .select("status")
              .eq("order_id", `AVATAR_USER_${cleanName}`)
              .maybeSingle();

            if (avRow && avRow.status && avRow.status.startsWith("AVATAR_DATA:")) {
              const savedAvatar = avRow.status.slice("AVATAR_DATA:".length);
              if (savedAvatar) {
                if (targetUser) targetUser.avatar = savedAvatar;
                else targetUser = { username: cleanName, avatar: savedAvatar };
              }
            }
          }

          // 2. Ambil data profil dari profiles table
          if (cleanName) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("*")
              .ilike("username", cleanName)
              .maybeSingle();

            if (prof) {
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
                if (!targetUser.avatar && prof.avatar_url) targetUser.avatar = prof.avatar_url;
              }
            }
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
            const { data: prof } = await supabase.from("profiles").select("id").eq("username", cleanId).single();
            if (prof) {
              const { data: { users } } = await supabase.auth.admin.listUsers();
              const u = users?.find(item => item.id === prof.id);
              if (u) loginEmail = u.email;
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
          
          // A. Cek dari record donasi AVATAR_USER_*
          const { data: avRow } = await supabase
            .from("donations")
            .select("status")
            .eq("order_id", `AVATAR_USER_${cleanUser}`)
            .maybeSingle();

          if (avRow && avRow.status && avRow.status.startsWith("AVATAR_DATA:")) {
            const savedAvatar = avRow.status.slice("AVATAR_DATA:".length);
            if (savedAvatar) {
              matchedUser.avatar = savedAvatar;
            }
          } else {
            // B. Fallback cek dari profiles table
            const { data: prof } = await supabase
              .from("profiles")
              .select("avatar_url")
              .ilike("username", cleanUser)
              .maybeSingle();
            if (prof && prof.avatar_url) {
              matchedUser.avatar = prof.avatar_url;
            }
          }

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
          targetEmail = u.email;
          break;
        }
      }

      // 2. Validasi ketat pendaftaran di Supabase Auth
      if (SUPABASE_SERVICE_ROLE) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          
          if (cleanId.includes("@")) {
            // Identifier adalah email: Cek apakah email terdaftar di Supabase tanpa membuat user baru
            const { error: otpErr } = await supabase.auth.signInWithOtp({
              email: cleanId,
              options: { shouldCreateUser: false }
            });

            // Jika Supabase menolak karena user belum terdaftar (status 422 / otp_disabled / Signups not allowed)
            const isUnregistered = otpErr && (
              otpErr.status === 422 || 
              otpErr.code === "otp_disabled" || 
              (otpErr.message && otpErr.message.toLowerCase().includes("signups not allowed"))
            );

            if (isUnregistered && !targetUser) {
              return res.status(404).json({
                error: "Email belum terdaftar di Gepa Corner. Silakan gunakan email yang sudah terdaftar atau buat akun baru."
              });
            }

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
            // Identifier adalah username: Cek apakah username terdaftar di profiles table
            const { data: prof } = await supabase.from("profiles").select("id, username").ilike("username", cleanId).maybeSingle();
            if (!prof && !targetUser) {
              return res.status(404).json({
                error: `Username @${cleanId} tidak terdaftar di Gepa Corner.`
              });
            }

            if (prof) {
              // Cari email yang terhubung dengan username ini
              const { data: userMap } = await supabase
                .from("donations")
                .select("status")
                .eq("order_id", `USER_MAP_${cleanId}`)
                .maybeSingle();

              if (userMap && userMap.status && userMap.status.startsWith("USER_EMAIL:")) {
                targetEmail = userMap.status.slice("USER_EMAIL:".length);
              }

              if (!targetEmail && targetUser && targetUser.email) {
                targetEmail = targetUser.email;
              }

              if (!targetEmail) {
                return res.status(404).json({
                  error: `Email untuk akun @${cleanId} belum tertaut. Silakan masukkan alamat email kamu saat mendaftar.`
                });
              }

              targetUser = {
                id: prof.id,
                email: targetEmail,
                username: prof.username,
                avatar: "👤"
              };

              // Kirim OTP ke targetEmail
              await supabase.auth.signInWithOtp({
                email: targetEmail,
                options: { shouldCreateUser: false }
              });
            }
          }
        } catch (e) {
          console.warn("Supabase lookup error for reset password:", e.message);
        }
      }

      if (!targetEmail) {
        return res.status(404).json({
          error: "Akun dengan email atau username tersebut tidak terdaftar di Gepa Corner."
        });
      }

      // Kirim juga link recovery resmi Supabase sebagai opsi tambahan
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
          }
        } catch (sbErr) {
          console.warn("Supabase auth reset error:", sbErr.message);
        }
      }

      // Generate verification code for secure fallback (kept server-side only, NEVER SENT IN JSON)
      const secureOtp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 15 * 60 * 1000;
      if (targetUser?.id) {
        resetOtps.set(targetUser.id, {
          code: secureOtp,
          expiresAt,
          userId: targetUser.id,
          email: targetEmail,
          username: targetUser.username
        });
      }
      resetOtps.set(targetEmail.toLowerCase(), {
        code: secureOtp,
        expiresAt,
        userId: targetUser?.id || null,
        email: targetEmail,
        username: targetUser?.username || ""
      });

      // Mask email for privacy (e.g. r***a@gmail.com)
      const [localPart, domainPart] = targetEmail.split("@");
      const maskedLocal = localPart.length > 2 
        ? localPart[0] + "***" + localPart.slice(-1)
        : localPart[0] + "***";
      const maskedEmail = `${maskedLocal}@${domainPart || "mail.com"}`;

      // CRITICAL: NEVER RETURN verificationCode / OTP IN RESPONSE!
      return res.status(200).json({
        success: true,
        message: `Instruksi pemulihan kata sandi resmi telah dikirim ke email ${maskedEmail}.`,
        maskedEmail,
        supabaseSent,
        userId: targetUser?.id || null
      });
    }

    // ==========================================
    // ACTION: VERIFY RESET PASSWORD / UPDATE VIA RECOVERY
    // ==========================================
    if ((action === "verify-reset-password" || action === "update-recovery-password") && req.method === "POST") {
      const { identifier, code, newPassword, accessToken } = req.body || {};
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password baru minimal 6 karakter." });
      }

      // Direct update via recovery accessToken from Supabase
      if (accessToken && SUPABASE_SERVICE_ROLE) {
        try {
          const userSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
          });
          const { error: updErr } = await userSb.auth.updateUser({ password: newPassword });
          if (!updErr) {
            const { data: { user: sbUser } } = await userSb.auth.getUser();
            if (sbUser) {
              const memU = memoryUsers.get(sbUser.id);
              if (memU) {
                memU.passwordHash = hashPassword(newPassword);
                saveUsersToDisk();
              }
            }
            return res.status(200).json({
              success: true,
              message: "Password berhasil diperbarui! Silakan masuk dengan kata sandi baru kamu. 🔐"
            });
          }
        } catch (e) {
          console.warn("Update password via recovery token error:", e.message);
        }
      }

      const cleanId = String(identifier || "").trim().toLowerCase();
      let targetUser = null;
      let targetEmail = null;

      for (const [_, u] of memoryUsers.entries()) {
        if (u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId) {
          targetUser = u;
          targetEmail = u.email;
          break;
        }
      }

      if (cleanId.includes("@")) {
        targetEmail = cleanId;
      }

      if (!targetUser && cleanId) {
        targetUser = {
          id: "usr_" + cleanId.replace(/[^a-z0-9_]/g, ""),
          email: targetEmail || cleanId,
          username: cleanId.replace(/[^a-z0-9_]/g, "")
        };
      }

      // Require code if accessToken was not valid
      if (!code) {
        return res.status(400).json({ error: "Kode verifikasi 6 digit wajib diisi." });
      }

      let otpValid = false;
      let sessionToken = null;

      // 1. Verifikasi kode OTP langsung ke Supabase Auth
      if (SUPABASE_SERVICE_ROLE && (targetEmail || targetUser?.email)) {
        const verifyEmail = targetEmail || targetUser.email;
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
            email: verifyEmail,
            token: String(code).trim(),
            type: "recovery"
          });
          if (!vErr && vData?.user) {
            otpValid = true;
            sessionToken = vData.session?.access_token || null;
            if (targetUser) targetUser.id = vData.user.id;
          } else if (vErr) {
            console.warn("Supabase verifyOtp message:", vErr.message);
          }
        } catch (e) {
          console.warn("Supabase verifyOtp error:", e.message);
        }
      }

      // 2. Fallback memory OTP
      const activeOtp = (targetUser && resetOtps.get(targetUser.id)) || (targetEmail && resetOtps.get(targetEmail.toLowerCase()));
      if (activeOtp && activeOtp.code === String(code).trim() && Date.now() <= activeOtp.expiresAt) {
        otpValid = true;
      }

      if (!otpValid) {
        return res.status(400).json({ error: "Kode verifikasi salah atau sudah kedaluwarsa. Silakan periksa kembali email Anda." });
      }

      // Update password hash lokal
      if (targetUser) {
        targetUser.passwordHash = hashPassword(newPassword);
        memoryUsers.set(targetUser.id, targetUser);
        saveUsersToDisk();
      }

      // Update di Supabase dengan session token hasil verifyOtp atau admin
      if (SUPABASE_SERVICE_ROLE) {
        try {
          if (sessionToken) {
            const userSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
              global: { headers: { Authorization: `Bearer ${sessionToken}` } }
            });
            await userSb.auth.updateUser({ password: newPassword });
          } else if (targetUser?.id && !targetUser.id.startsWith("demo_")) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
            await supabase.auth.admin.updateUserById(targetUser.id, { password: newPassword });
          }
        } catch (sbErr) {
          console.warn("Supabase reset password update:", sbErr.message);
        }
      }

      // Invalidate OTP
      if (targetUser?.id) resetOtps.delete(targetUser.id);
      if (targetEmail) resetOtps.delete(targetEmail.toLowerCase());

      return res.status(200).json({
        success: true,
        message: "Password berhasil diperbarui! Silakan masuk dengan password baru kamu. 🔐"
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

          // 1. Simpan permanen ke Supabase donations table (AVATAR_USER_*)
          // Mengatasi kendala RLS pada profiles table pada key anon/publishable
          if (user.avatar) {
            await supabase.from("donations").upsert({
              order_id: `AVATAR_USER_${cleanUsername}`,
              username: cleanUsername,
              amount: 0,
              status: `AVATAR_DATA:${user.avatar}`,
              transaction_time: new Date().toISOString(),
              user_id: !userId.startsWith("demo_") ? userId : null
            }, { onConflict: "order_id" });
          }

          // 2. Coba simpan ke profiles table jika client menyertakan JWT auth token
          try {
            const authHeader = req.headers.authorization;
            const userToken = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
            const clientHeaders = userToken && userToken.length > 50 ? { Authorization: `Bearer ${userToken}` } : {};

            const clientSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
              global: { headers: clientHeaders }
            });
            
            await clientSb.from("profiles").upsert({
              id: userId,
              username: user.username,
              avatar_url: user.avatar,
              phone: user.phone,
              updated_at: new Date().toISOString()
            });
          } catch (pErr) {
            // Profile RLS fallback handled by step 1
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
