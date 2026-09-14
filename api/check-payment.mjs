export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
        console.error(
            'MIDTRANS_SERVER_KEY belum diset.'
        );

        return res.status(500).json({
            error: 'Server configuration error'
        });
    }

    try {
        // ==========================================
        // 1. AMBIL ORDER ID
        // ==========================================

        const { order_id } = req.query;

        if (
            typeof order_id !== 'string' ||
            !order_id.trim()
        ) {
            return res.status(400).json({
                error: 'order_id wajib diisi'
            });
        }

        const cleanOrderId = order_id.trim();

        // ==========================================
        // 2. TANYAKAN STATUS KE MIDTRANS
        // ==========================================

        const auth = Buffer
            .from(`${serverKey}:`)
            .toString('base64');

        const midtransResponse = await fetch(
            `https://app.sandbox.midtrans.com/v2/${encodeURIComponent(cleanOrderId)}/status`,
            {
                method: 'GET',

                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${auth}`
                }
            }
        );

        const data =
            await midtransResponse.json();

        // ==========================================
        // 3. ORDER TIDAK DITEMUKAN
        // ==========================================

        if (!midtransResponse.ok) {
            console.error(
                'Midtrans status error:',
                midtransResponse.status,
                data
            );

            return res.status(
                midtransResponse.status
            ).json({
                error:
                    data.status_message ||
                    'Transaksi tidak ditemukan'
            });
        }

        // ==========================================
        // 4. KIRIM STATUS KE FRONTEND
        // ==========================================

        return res.status(200).json({
            order_id: data.order_id,
            transaction_status:
                data.transaction_status || null,
            fraud_status:
                data.fraud_status || null,
            payment_type:
                data.payment_type || null,
            gross_amount:
                data.gross_amount || null,
            transaction_time:
                data.transaction_time || null
        });

    } catch (error) {
        console.error(
            'Check payment error:',
            error
        );

        return res.status(500).json({
            error: 'Gagal mengecek status pembayaran'
        });
    }
}