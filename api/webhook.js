import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Pastikan environment variable tersedia
    if (!serverKey || !supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Environment variable belum lengkap.');

        return res.status(500).json({
            error: 'Server configuration error'
        });
    }

    try {
        const data = req.body || {};

        // ==========================================
        // 1. VALIDASI DATA DARI MIDTRANS
        // ==========================================

        if (
            !data.order_id ||
            !data.status_code ||
            !data.gross_amount ||
            !data.signature_key
        ) {
            return res.status(400).json({
                error: 'Data webhook tidak lengkap'
            });
        }

        // ==========================================
        // 2. VERIFIKASI SIGNATURE MIDTRANS
        // ==========================================

        const signatureString =
            data.order_id +
            data.status_code +
            data.gross_amount +
            serverKey;

        const hash = crypto
            .createHash('sha512')
            .update(signatureString)
            .digest('hex');

        if (data.signature_key !== hash) {
            console.error(
                'Invalid signature:',
                data.order_id
            );

            return res.status(403).json({
                error: 'Invalid signature'
            });
        }

        // ==========================================
        // 3. CEK STATUS TRANSAKSI
        // ==========================================

        const isSuccess =
            data.transaction_status === 'settlement' ||
            data.transaction_status === 'capture';

        // Pending / expire / cancel / deny tidak masuk ranking
        if (!isSuccess) {
            console.log(
                `Transaksi ${data.order_id} status: ${data.transaction_status}`
            );

            return res.status(200).json({
                status: 'ignored',
                transaction_status: data.transaction_status
            });
        }

        // ==========================================
        // 4. BERSIHKAN USERNAME
        // ==========================================

        const username =
            typeof data.custom_field1 === 'string' &&
            data.custom_field1.trim()
                ? data.custom_field1.trim().substring(0, 15)
                : 'Anonim';

        // ==========================================
        // 5. VALIDASI NOMINAL
        // ==========================================

        const amount = Number(data.gross_amount);

        if (!Number.isInteger(amount) || amount < 1000) {
            console.error(
                'Nominal transaksi tidak valid:',
                data.gross_amount
            );

            return res.status(400).json({
                error: 'Invalid transaction amount'
            });
        }

        // ==========================================
        // 6. WAKTU TRANSAKSI
        // ==========================================

        let transactionTime = new Date().toISOString();

        if (data.transaction_time) {
            const midtransTime = String(
                data.transaction_time
            ).replace(' ', 'T');

            const parsedTime = new Date(
                `${midtransTime}+07:00`
            );

            if (!Number.isNaN(parsedTime.getTime())) {
                transactionTime =
                    parsedTime.toISOString();
            }
        }

        // ==========================================
        // 7. SIMPAN KE SUPABASE
        // ==========================================

        const supabaseResponse = await fetch(
            `${supabaseUrl}/rest/v1/donations`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceRoleKey,
                    'Authorization':
                        `Bearer ${supabaseServiceRoleKey}`,
                    'Prefer':
                        'resolution=merge-duplicates,return=minimal'
                },

                body: JSON.stringify({
                    order_id: data.order_id,
                    username: username,
                    amount: amount,
                    transaction_time: transactionTime,
                    status: data.transaction_status
                })
            }
        );

        // ==========================================
        // 8. CEK HASIL SUPABASE
        // ==========================================

        if (!supabaseResponse.ok) {
            const errorText =
                await supabaseResponse.text();

            console.error(
                'Supabase error:',
                supabaseResponse.status,
                errorText
            );

            return res.status(500).json({
                error: 'Gagal menyimpan transaksi'
            });
        }

        console.log(
            `Donation berhasil disimpan: ${data.order_id} | ${username} | Rp${amount}`
        );

        // ==========================================
        // 9. BALAS KE MIDTRANS
        // ==========================================

        return res.status(200).json({
            status: 'ok'
        });

    } catch (error) {
        console.error(
            'Webhook error:',
            error
        );

        return res.status(500).json({
            error: 'Terjadi kesalahan server'
        });
    }
}