import crypto from 'crypto';

// CATATAN PENTING UNTUK PRODUCTION:
// Array global ini bersifat sementara di Serverless Vercel. 
// Jika deploy ke production sungguhan, ganti dengan Database seperti Vercel KV / Supabase.
// Karena kita memanfaatkan sistem yang paling sederhana sesuai request, kita simpan di memory runtime.
if (!global.successfulDonations) {
    global.successfulDonations = []; 
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const data = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // 1. Verifikasi Keamanan (Signature Key Midtrans)
    const hash = crypto.createHash('sha512').update(data.order_id + data.status_code + data.gross_amount + serverKey).digest('hex');
    
    if (data.signature_key !== hash) {
        return res.status(403).json({ error: 'Invalid signature' });
    }

    // 2. Cek apakah transaksi sukses (settlement atau capture)
    const isSuccess = data.transaction_status === 'settlement' || data.transaction_status === 'capture';

    if (isSuccess) {
        // Cek agar tidak double entry
        const exists = global.successfulDonations.find(tx => tx.order_id === data.order_id);
        
        if (!exists) {
            global.successfulDonations.push({
                order_id: data.order_id,
                username: data.custom_field1 || 'Anonim',
                amount: parseFloat(data.gross_amount),
                time: data.transaction_time // Format: "2023-10-25 14:30:00"
            });
        }
    }

    // Midtrans membutuhkan HTTP 200 OK agar berhenti mengirim notifikasi
    return res.status(200).json({ status: 'ok' });
}
