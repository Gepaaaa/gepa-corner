// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { memoryTransactions } from "./transactions.mjs";
import { getAuthenticatedUser } from "./auth.mjs";

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
    // 1. Enforce strict authentication: Users can only view their OWN donation history
    const authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Autentikasi diperlukan untuk melihat riwayat donasi. Silakan masuk terlebih dahulu.'
      });
    }

    const verifiedUserId = authenticatedUser.id;
    const verifiedUsername = (authenticatedUser.username || "").replace(/^@/, "");

    const donations = [];
    const seenOrderIds = new Set();

    // 2. Fetch verified donations from Supabase matching the authenticated user
    if (SUPABASE_SERVICE_ROLE && (verifiedUserId || verifiedUsername)) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
        let query = supabase.from('donations').select('*');
        
        if (verifiedUsername && verifiedUserId) {
          query = query.or(`username.ilike.${verifiedUsername},user_id.eq.${verifiedUserId}`);
        } else if (verifiedUsername) {
          query = query.ilike('username', verifiedUsername);
        } else if (verifiedUserId) {
          query = query.eq('user_id', verifiedUserId);
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
              username: d.username || verifiedUsername
            });
            seenOrderIds.add(d.order_id);
          });
        }
      } catch (err) {
        console.warn("Supabase user donations fetch warning:", err.message);
      }
    }

    // 3. Merge with memoryTransactions cache matching authenticated username
    if (verifiedUsername) {
      const targetUser = verifiedUsername.toLowerCase();
      for (const [orderId, tx] of memoryTransactions.entries()) {
        const txUser = String(tx?.username || "").replace(/^@/, "").toLowerCase();
        if (txUser === targetUser && !seenOrderIds.has(orderId)) {
          donations.push({
            order_id: tx.order_id || orderId,
            amount: Number(tx.gross_amount || tx.amount) || 0,
            status: tx.transaction_status || "settlement",
            payment_type: tx.payment_type || "ONLINE PAYMENT",
            transaction_time: tx.transaction_time || new Date().toISOString(),
            username: tx.username || verifiedUsername
          });
          seenOrderIds.add(orderId);
        }
      }
    }

    // Sort newest to oldest
    donations.sort((a, b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());

    return res.status(200).json(donations);
  } catch (error) {
    console.error('User donations error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan internal server saat memuat riwayat donasi.' });
  }
};
