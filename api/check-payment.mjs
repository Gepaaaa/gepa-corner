// @ts-nocheck

/* =========================================================
   GEPA - CHECK PAYMENT STATUS
   Midtrans + Supabase Fallback
========================================================= */

export default async function handler(req, res) {

    /* =====================================================
       METHOD CHECK
    ===================================================== */
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    /* =====================================================
       ENVIRONMENT VARIABLES
    ===================================================== */
    const serverKey =
        process.env.MIDTRANS_SERVER_KEY;

    const supabaseUrl =
        process.env.SUPABASE_URL;

    const supabaseServiceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
        !serverKey ||
        !supabaseUrl ||
        !supabaseServiceRoleKey
    ) {
        console.error(
            "Environment variable belum lengkap."
        );

        return res.status(500).json({
            error: "Server configuration error"
        });
    }

    /* =====================================================
       GET ORDER ID
    ===================================================== */
    try {

        const { order_id } = req.query;

        if (
            typeof order_id !== "string" ||
            !order_id.trim()
        ) {
            return res.status(400).json({
                error: "order_id wajib diisi"
            });
        }

        const cleanOrderId =
            order_id.trim();

        /* =================================================
           MIDTRANS AUTH
        ================================================= */
        const auth =
            Buffer
                .from(`${serverKey}:`)
                .toString("base64");

        /* =================================================
           1. CEK MIDTRANS
        ================================================= */
        let midtransData = null;
        let midtransStatus = null;

        try {

            const midtransResponse =
                await fetch(
                    `https://app.sandbox.midtrans.com/v2/${encodeURIComponent(cleanOrderId)}/status`,
                    {
                        method: "GET",
                        headers: {
                            "Accept":
                                "application/json",

                            "Authorization":
                                `Basic ${auth}`
                        }
                    }
                );

            const responseText =
                await midtransResponse.text();

            try {
                midtransData =
                    JSON.parse(responseText);
            } catch {
                midtransData = null;
            }

            if (midtransResponse.ok) {

                midtransStatus =
                    midtransData?.transaction_status ||
                    null;

                console.log(
                    "Midtrans status:",
                    cleanOrderId,
                    midtransStatus
                );

                /* =========================================
                   Kalau Midtrans sudah sukses,
                   langsung return sukses.
                ========================================= */
                if (
                    midtransStatus === "settlement" ||
                    midtransStatus === "capture"
                ) {
                    return res.status(200).json({
                        order_id:
                            midtransData.order_id ||
                            cleanOrderId,

                        transaction_status:
                            midtransStatus,

                        fraud_status:
                            midtransData.fraud_status ||
                            null,

                        payment_type:
                            midtransData.payment_type ||
                            null,

                        gross_amount:
                            midtransData.gross_amount ||
                            null,

                        transaction_time:
                            midtransData.transaction_time ||
                            null,

                        source: "midtrans"
                    });
                }

            } else {

                console.error(
                    "Midtrans status error:",
                    midtransResponse.status,
                    midtransData
                );
            }

        } catch (midtransError) {

            console.error(
                "Midtrans request failed:",
                midtransError
            );
        }

        /* =================================================
           2. FALLBACK KE SUPABASE
        ================================================= */

        console.log(
            "Checking Supabase fallback:",
            cleanOrderId
        );

        try {

            const supabaseQuery =
                `${supabaseUrl}/rest/v1/donations` +
                `?select=order_id,username,amount,transaction_time,status` +
                `&order_id=eq.${encodeURIComponent(cleanOrderId)}` +
                `&limit=1`;

            const supabaseResponse =
                await fetch(
                    supabaseQuery,
                    {
                        method: "GET",

                        headers: {
                            "apikey":
                                supabaseServiceRoleKey,

                            "Authorization":
                                `Bearer ${supabaseServiceRoleKey}`
                        }
                    }
                );

            const supabaseText =
                await supabaseResponse.text();

            let supabaseData = null;

            try {
                supabaseData =
                    JSON.parse(
                        supabaseText
                    );
            } catch {
                supabaseData = null;
            }

            if (
                !supabaseResponse.ok
            ) {

                console.error(
                    "Supabase status error:",
                    supabaseResponse.status,
                    supabaseData
                );

            } else if (
                Array.isArray(
                    supabaseData
                ) &&
                supabaseData.length > 0
            ) {

                const donation =
                    supabaseData[0];

                console.log(
                    "Supabase transaction found:",
                    donation.order_id,
                    donation.status
                );

                /* =========================================
                   SUPABASE MENYATAKAN SUKSES
                ========================================= */
                if (
                    donation.status === "settlement" ||
                    donation.status === "capture"
                ) {

                    return res.status(200).json({
                        order_id:
                            donation.order_id,

                        transaction_status:
                            donation.status,

                        fraud_status:
                            null,

                        payment_type:
                            midtransData?.payment_type ||
                            null,

                        gross_amount:
                            String(
                                donation.amount
                            ),

                        transaction_time:
                            donation.transaction_time ||
                            null,

                        username:
                            donation.username ||
                            "Anonim",

                        source:
                            "supabase"
                    });
                }

                /* =========================================
                   Kalau database ada tapi status belum
                   sukses, kembalikan status database.
                ========================================= */
                return res.status(200).json({
                    order_id:
                        donation.order_id,

                    transaction_status:
                        donation.status ||
                        midtransStatus ||
                        "unknown",

                    fraud_status:
                        midtransData?.fraud_status ||
                        null,

                    payment_type:
                        midtransData?.payment_type ||
                        null,

                    gross_amount:
                        String(
                            donation.amount
                        ),

                    transaction_time:
                        donation.transaction_time ||
                        null,

                    username:
                        donation.username ||
                        "Anonim",

                    source:
                        "supabase"
                });
            }

        } catch (supabaseError) {

            console.error(
                "Supabase fallback failed:",
                supabaseError
            );
        }

        /* =================================================
           3. KALAU MIDTRANS MEMBERIKAN STATUS
              TAPI SUPABASE TIDAK MENEMUKAN DATA
        ================================================= */

        if (midtransData) {

            return res.status(200).json({
                order_id:
                    midtransData.order_id ||
                    cleanOrderId,

                transaction_status:
                    midtransData.transaction_status ||
                    null,

                fraud_status:
                    midtransData.fraud_status ||
                    null,

                payment_type:
                    midtransData.payment_type ||
                    null,

                gross_amount:
                    midtransData.gross_amount ||
                    null,

                transaction_time:
                    midtransData.transaction_time ||
                    null,

                source:
                    "midtrans"
            });
        }

        /* =================================================
           4. KEDUA SUMBER TIDAK MENEMUKAN TRANSAKSI
        ================================================= */

        return res.status(404).json({
            error:
                "Transaksi tidak ditemukan."
        });

    } catch (error) {

        console.error(
            "Check payment error:",
            error
        );

        return res.status(500).json({
            error:
                "Gagal mengecek status pembayaran"
        });
    }
}