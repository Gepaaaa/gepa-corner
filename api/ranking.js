import { memoryTransactions } from "./transactions.mjs";
import { memoryUsers } from "./auth.mjs";

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    const supabaseUrl = process.env.SUPABASE_URL || "https://dkybfxbhlwyrjcycpatp.supabase.co";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        let transactions = [];
        const profileAvatarMap = new Map();

        // 1. Ambil profiles dari Supabase untuk sinkronisasi avatar resmi
        if (supabaseUrl && supabaseServiceRoleKey) {
            try {
                const profRes = await fetch(
                    `${supabaseUrl}/rest/v1/profiles?select=id,username,avatar_url`,
                    {
                        method: 'GET',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`
                        }
                    }
                );
                if (profRes.ok) {
                    const profData = await profRes.json();
                    if (Array.isArray(profData)) {
                        profData.forEach(p => {
                            if (p && p.username && p.avatar_url) {
                                const clean = String(p.username).trim().replace(/^@/, "").toLowerCase();
                                profileAvatarMap.set(clean, p.avatar_url);
                            }
                        });
                    }
                }
            } catch (profErr) {
                console.warn("Supabase profiles ranking fetch fallback:", profErr.message);
            }
        }

        // 2. Ambil donasi dari Supabase (status settlement atau capture)
        if (supabaseUrl && supabaseServiceRoleKey) {
            try {
                const response = await fetch(
                    `${supabaseUrl}/rest/v1/donations?status=in.(settlement,capture)&select=order_id,username,amount,transaction_time&order=transaction_time.desc`,
                    {
                        method: 'GET',
                        headers: {
                            'apikey': supabaseServiceRoleKey,
                            'Authorization': `Bearer ${supabaseServiceRoleKey}`
                        }
                    }
                );

                if (response.ok) {
                    const sbData = await response.json();
                    if (Array.isArray(sbData)) {
                        transactions = sbData;
                    }
                }
            } catch (sbErr) {
                console.warn("Supabase ranking fetch fallback:", sbErr.message);
            }
        }

        // 3. Gabungkan dengan transaksi in-memory (status settlement / capture)
        const orderIds = new Set(transactions.map(t => t.order_id));
        for (const [orderId, tx] of memoryTransactions.entries()) {
            const status = (tx.transaction_status || "").toLowerCase();
            if ((status === "settlement" || status === "capture" || status === "success") && !orderIds.has(orderId)) {
                transactions.push({
                    order_id: tx.order_id || orderId,
                    username: tx.username || "Anonim",
                    amount: Number(tx.gross_amount || tx.amount) || 0,
                    transaction_time: tx.transaction_time || new Date().toISOString(),
                    avatar: tx.avatar
                });
                orderIds.add(orderId);
            }
        }

        // Helper untuk mencari avatar pengguna yang akurat
        const getAvatarForUsername = (rawUsername) => {
            if (!rawUsername) return "✨";
            const clean = String(rawUsername).trim().replace(/^@/, "").toLowerCase();

            // 1. Cek dari profil Supabase
            if (profileAvatarMap.has(clean)) {
                return profileAvatarMap.get(clean);
            }

            // 2. Cek di memoryUsers
            for (const [_, u] of memoryUsers.entries()) {
                if (u && u.username && String(u.username).trim().replace(/^@/, "").toLowerCase() === clean) {
                    if (u.avatar) return u.avatar;
                }
            }

            // 3. Cek di memoryTransactions
            for (const [_, tx] of memoryTransactions.entries()) {
                if (tx && tx.username && String(tx.username).trim().replace(/^@/, "").toLowerCase() === clean && tx.avatar) {
                    return tx.avatar;
                }
            }

            return "✨";
        };

        const now = new Date();

        // Helper Waktu Indonesia (WIB)
        const getWIBParts = (date) => {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const parts = formatter.formatToParts(date);
            const result = {};
            parts.forEach(part => {
                if (part.type !== 'literal') {
                    result[part.type] = Number(part.value);
                }
            });
            return result;
        };

        const nowWIB = getWIBParts(now);

        const isToday = (dateStr) => {
            try {
                const d = new Date(dateStr);
                const parts = getWIBParts(d);
                return (
                    parts.year === nowWIB.year &&
                    parts.month === nowWIB.month &&
                    parts.day === nowWIB.day
                );
            } catch (e) {
                return false;
            }
        };

        const getWIBDate = (date) => {
            const parts = getWIBParts(date);
            return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
        };

        const todayWIB = getWIBDate(now);
        const day = todayWIB.getUTCDay();
        const dayNumber = day === 0 ? 7 : day;
        const startOfWeek = new Date(todayWIB);
        startOfWeek.setUTCDate(todayWIB.getUTCDate() - dayNumber + 1);

        const isThisWeek = (dateStr) => {
            try {
                const transactionDate = getWIBDate(new Date(dateStr));
                return transactionDate >= startOfWeek;
            } catch (e) {
                return false;
            }
        };

        // Pengelompokan & Agregasi Ranking (Case-Insensitive & Normalized @)
        const aggregateData = (txList) => {
            const map = {};

            txList.forEach(tx => {
                const rawUsername =
                    typeof tx.username === 'string' && tx.username.trim()
                        ? tx.username.trim().replace(/^@/, '')
                        : 'Anonim';

                const key = rawUsername.toLowerCase();

                if (!map[key]) {
                    map[key] = {
                        username: rawUsername,
                        avatar: tx.avatar || getAvatarForUsername(rawUsername),
                        totalAmount: 0,
                        txCount: 0
                    };
                }

                map[key].totalAmount += Number(tx.amount) || 0;
                map[key].txCount += 1;

                // Update avatar jika ada avatar lebih spesifik
                if (tx.avatar && (map[key].avatar === "✨" || !map[key].avatar)) {
                    map[key].avatar = tx.avatar;
                }
                const profileAvatar = getAvatarForUsername(rawUsername);
                if (profileAvatar && profileAvatar !== "✨") {
                    map[key].avatar = profileAvatar;
                }
            });

            return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
        };

        const dailyTx = transactions.filter(tx => isToday(tx.transaction_time));
        const weeklyTx = transactions.filter(tx => isThisWeek(tx.transaction_time));
        const lifetimeTx = transactions;

        return res.status(200).json({
            daily: aggregateData(dailyTx),
            weekly: aggregateData(weeklyTx),
            lifetime: aggregateData(lifetimeTx)
        });

    } catch (error) {
        console.error('Ranking error:', error);
        return res.status(500).json({
            error: 'Terjadi kesalahan server saat memproses ranking'
        });
    }
}