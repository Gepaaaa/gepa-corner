// @ts-nocheck

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const serverKey =
        process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
        console.error(
            "MIDTRANS_SERVER_KEY belum diset."
        );

        return res.status(500).json({
            error: "Server configuration error"
        });
    }

    try {
        const orderId =
            typeof req.query.order_id === "string"
                ? req.query.order_id.trim()
                : "";

        if (!orderId) {
            return res.status(400).json({
                error: "order_id wajib diisi"
            });
        }

        const auth = Buffer
            .from(`${serverKey}:`)
            .toString("base64");

        /*
         * IMPORTANT:
         * Get Status API Midtrans menggunakan
         * api.sandbox.midtrans.com
         *
         * BUKAN:
         * app.sandbox.midtrans.com
         */
        const midtransResponse = await fetch(
            `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Basic ${auth}`
                }
            }
        );

        const data =
            await midtransResponse.json();

        console.log(
            "Midtrans status response:",
            orderId,
            data
        );

        if (!midtransResponse.ok) {
            return res.status(
                midtransResponse.status
            ).json({
                error:
                    data.status_message ||
                    "Gagal mengambil status transaksi.",
                order_id: orderId
            });
        }

        return res.status(200).json({
            order_id:
                data.order_id ||
                orderId,

            transaction_id:
                data.transaction_id ||
                null,

            transaction_status:
                data.transaction_status ||
                null,

            fraud_status:
                data.fraud_status ||
                null,

            payment_type:
                data.payment_type ||
                null,

            gross_amount:
                data.gross_amount ||
                null,

            transaction_time:
                data.transaction_time ||
                null,

            status_code:
                data.status_code ||
                null,

            status_message:
                data.status_message ||
                null
        });

    } catch (error) {
        console.error(
            "Check payment error:",
            error
        );

        return res.status(500).json({
            error:
                "Gagal mengecek status pembayaran."
        });
    }
}