// api/user-donations.mjs
// Endpoint untuk query riwayat donasi user yang terah login
// GET /api/user-donations
// Header: Authorization: Bearer <access_token>
// Response: Array of donations { order_id, amount, status, transaction_time }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Missing Supabase credentials');
}

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

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = user.id;

    // Query donations by user_id (service-role bypass RLS)
    const { data: donations, error: donationsError } = await supabaseAdmin
      .from('donations')
      .select('order_id, amount, status, transaction_time')
      .eq('user_id', userId)
      .order('transaction_time', { ascending: false });

    if (donationsError) {
      console.error('Donations query error:', donationsError);
      return res.status(500).json({ error: 'Failed to fetch donations' });
    }

    res.status(200).json(donations || []);
  } catch (error) {
    console.error('User donations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
