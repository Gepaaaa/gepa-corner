// api/username-login.mjs
// Endpoint untuk query email by username (dipakai saat login dengan username)
// POST /api/username-login
// Body: { username: string }
// Response: { email: string } atau error 404

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Missing Supabase credentials');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async (req, res) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Query profiles table untuk dapatkan username → id → email
    // Tapi kita tidak bisa langsung query email dari profiles karena email ada di auth.users
    // Solusi: store email di profiles saat register, atau gunakan RPC
    
    // Untuk saat ini, kita gunakan approach simple: query profiles by username (public data),
    // kemudian gunakan Supabase REST API untuk query auth.users (perlu service-role key)
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Username not found' });
    }

    // Query auth.users untuk dapatkan email by id (service-role key bypass)
    // Kita gunakan admin endpoint untuk ini
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error || !users) {
      return res.status(500).json({ error: 'Failed to verify user' });
    }

    const user = users.find((u) => u.id === profile.id);

    if (!user || !user.email) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ email: user.email });
  } catch (error) {
    console.error('Username login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
