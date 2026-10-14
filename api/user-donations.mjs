// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { memoryTransactions } from "./transactions.mjs";
import { memoryUsers } from "./auth.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dkybfxbhlwyrjcycpatp.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async (req, res) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    let queryUsername = typeof req.query.username === "string" ? req.query.username.trim().replace(/^@/, '') : null;
    let userId = typeof req.query.userId === "string" ? req.query.userId.trim() : null;

    // Coba resolve user dari token jika ada
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      
      // Cek apakah token berasal dari Supabase
      if (SUPABASE_SERVICE_ROLE && token.length > 50) {
        try {
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (user && !error) {
            userId = user.id;
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('username')
              .eq('id', userId)
              .single();
            if (profile && profile.username) {
              queryUsername = profile.username.replace(/^@/, '');
            }
          }
        } catch (e) {
          // Token mungkin token internal
        }
      }
    }

    // Cari username dari memoryUsers jika userId diberikan
    if (userId && !queryUsername) {
      const memUser = memoryUsers.get(userId);
      if (memUser && memUser.username) {
        queryUsername = memUser.username.replace(/^@/, '');
      }
    }

    const donations = [];
    const seenOrderIds = new Set();

    // 1. Ambil dari Supabase mencakup username ATAU user_id (karena transaksi bisa tersimpan dengan user_id null)
    if (SUPABASE_SERVICE_ROLE && (userId || queryUsername)) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
        let query = supabase.from('donations').select('*');
        
        if (queryUsername && userId) {
          query = query.or(`username.ilike.${queryUsername},user_id.eq.${userId}`);
        } else if (queryUsername) {
          query = query.ilike('username', queryUsername);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data: sbDonations, error: sbErr } = await query.order('transaction_time', { ascending: false });
        if (!sbErr && Array.isArray(sbDonations)) {
          sbDonations.forEach(d => {
            donations.push({
              order_id: d.order_id,
              amount: Number(d.amount) || 0,
              status: d.status || "settlement",
              payment_type: d.payment_type || "ONLINE PAYMENT",
              transaction_time: d.transaction_time || new Date().toISOString(),
              username: d.username || queryUsername
            });
            seenOrderIds.add(d.order_id);
          });
        }
      } catch (err) {
        console.warn("Supabase user donations fallback:", err.message);
      }
    }

    // 2. Gabungkan dengan memoryTransactions
    if (queryUsername) {
      const targetUser = queryUsername.toLowerCase();
      for (const [orderId, tx] of memoryTransactions.entries()) {
        const txUser = String(tx?.username || "").replace(/^@/, "").toLowerCase();
        if (txUser === targetUser && !seenOrderIds.has(orderId)) {
          donations.push({
            order_id: tx.order_id || orderId,
            amount: Number(tx.gross_amount || tx.amount) || 0,
            status: tx.transaction_status || "settlement",
            payment_type: tx.payment_type || "ONLINE PAYMENT",
            transaction_time: tx.transaction_time || new Date().toISOString(),
            username: tx.username || queryUsername
          });
          seenOrderIds.add(orderId);
        }
      }
    }

    // Urutkan dari yang paling baru
    donations.sort((a, b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());

    return res.status(200).json(donations);
  } catch (error) {
    console.error('User donations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
