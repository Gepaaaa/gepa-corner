// @ts-nocheck
import { memoryTransactions, saveTransactionsToDisk } from "./transactions.mjs";

export default async function handler(req, res) {
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const orderId =
        (typeof req.query.order_id === "string" ? req.query.order_id.trim() : "") ||
        (typeof req.query.orderId === "string" ? req.query.orderId.trim() : "") ||
        (typeof req.body?.order_id === "string" ? req.body.order_id.trim() : "") ||
        (typeof req.body?.orderId === "string" ? req.body.orderId.trim() : "");

    if (!orderId) {
        return res.status(400).json({
            error: "order_id wajib diisi"
        });
    }

    // Never accept client-forged settlement status without server-side Midtrans verification!
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true" || process.env.MIDTRANS_PRODUCTION === "true";
    const midtransBaseUrl = isProduction ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";

    const supabaseUrl = process.env.SUPABASE_URL || "https://dkybfxbhlwyrjcycpatp.supabase.co";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const cachedOrder = memoryTransactions.get(orderId);

    // 1. Authoritative verification directly via Midtrans API
    if (serverKey) {
        try {
            const auth = Buffer
                .from(`${serverKey}:`)
                .toString("base64");

            const midtransResponse = await fetch(
                `${midtransBaseUrl}/${encodeURIComponent(orderId)}/status`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Basic ${auth}`
                    }
                }
            );

            const data = await midtransResponse.json().catch(() => null);

            // If Midtrans explicitly responds that the transaction does not exist or has 4xx status code
            if (midtransResponse.status === 404 || (data && (data.status_code === "404" || !data.transaction_status))) {
                return res.status(404).json({
                    error: (data && data.status_message) || "Transaksi tidak ditemukan di Midtrans",
                    order_id: orderId,
                    transaction_status: "not_found",
                    status_code: (data && data.status_code) || "404",
                    verified: false
                });
            }

            if (midtransResponse.ok && data && data.transaction_status) {
                const username = (data.custom_field1 || (cachedOrder && cachedOrder.username) || "Supporter").replace(/^@/, "");
                const isSuccess = data.transaction_status === "settlement" ||
                    (data.transaction_status === "capture" && data.fraud_status === "accept");

                const updated = {
                    ...(cachedOrder || {}),
                    order_id: data.order_id || orderId,
                    orderId: data.order_id || orderId,
                    gross_amount: Number(data.gross_amount) || 0,
                    amount: Number(data.gross_amount) || 0,
                    username: username,
                    avatar: (cachedOrder && cachedOrder.avatar) || "✨",
                    transaction_status: data.transaction_status,
                    payment_type: data.payment_type || "ONLINE PAYMENT",
                    transaction_time: data.transaction_time || (cachedOrder && cachedOrder.transaction_time) || new Date().toISOString()
                };

                memoryTransactions.set(orderId, updated);
                saveTransactionsToDisk();

                // Persist verified transactions to Supabase donations table
                if (isSuccess && supabaseUrl && supabaseServiceRoleKey) {
                    try {
                        let parsedTime = new Date().toISOString();
                        if (data.transaction_time) {
                            const midtransTime = String(data.transaction_time).replace(" ", "T");
                            const d = new Date(`${midtransTime}+07:00`);
                            if (!Number.isNaN(d.getTime())) parsedTime = d.toISOString();
                        }

                        await fetch(`${supabaseUrl}/rest/v1/donations`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "apikey": supabaseServiceRoleKey,
                                "Authorization": `Bearer ${supabaseServiceRoleKey}`,
                                "Prefer": "resolution=merge-duplicates,return=minimal"
                            },
                            body: JSON.stringify({
                                order_id: data.order_id || orderId,
                                username: username,
                                amount: Number(data.gross_amount) || 0,
                                transaction_time: parsedTime,
                                status: data.transaction_status,
                                user_id: data.custom_field2 || (cachedOrder && cachedOrder.userId) || null
                            })
                        });
                    } catch (sbErr) {
                        console.warn("Supabase verified donation sync warning:", sbErr.message);
                    }
                }

                return res.status(200).json({
                    order_id: data.order_id || orderId,
                    transaction_id: data.transaction_id || null,
                    transaction_status: data.transaction_status,
                    fraud_status: data.fraud_status || null,
                    payment_type: data.payment_type || null,
                    gross_amount: data.gross_amount || null,
                    username: username,
                    transaction_time: data.transaction_time || null,
                    status_code: data.status_code || null,
                    status_message: data.status_message || null,
                    verified: isSuccess
                });
            }
        } catch (error) {
            console.warn("Midtrans status check network error:", error.message);
        }
    }

    // 2. Secondary check: Query Supabase donations table for previously verified webhook records
    if (supabaseUrl && supabaseServiceRoleKey) {
        try {
            const sbRes = await fetch(
                `${supabaseUrl}/rest/v1/donations?order_id=eq.${encodeURIComponent(orderId)}&select=*`,
                {
                    headers: {
                        apikey: supabaseServiceRoleKey,
                        Authorization: `Bearer ${supabaseServiceRoleKey}`
                    }
                }
            );
            if (sbRes.ok) {
                const rows = await sbRes.json();
                if (Array.isArray(rows) && rows.length > 0) {
                    const verifiedRow = rows[0];
                    return res.status(200).json({
                        order_id: verifiedRow.order_id,
                        transaction_id: "TX-" + verifiedRow.order_id,
                        transaction_status: verifiedRow.status,
                        fraud_status: "accept",
                        payment_type: verifiedRow.payment_type || "ONLINE PAYMENT",
                        gross_amount: verifiedRow.amount,
                        username: (verifiedRow.username || "Supporter").replace(/^@/, ""),
                        transaction_time: verifiedRow.transaction_time,
                        status_code: "200",
                        status_message: "Verified from database",
                        verified: true
                    });
                }
            }
        } catch (sbQueryErr) {
            console.warn("Supabase check-payment lookup fallback error:", sbQueryErr.message);
        }
    }

    // 3. In-memory check only if order was officially initialized by create-payment
    if (cachedOrder && cachedOrder.status && cachedOrder.status !== "settlement") {
        return res.status(200).json({
            order_id: cachedOrder.order_id || orderId,
            transaction_id: "TX-" + orderId,
            transaction_status: cachedOrder.transaction_status || "pending",
            fraud_status: "accept",
            payment_type: cachedOrder.payment_type || "ONLINE PAYMENT",
            gross_amount: cachedOrder.gross_amount || cachedOrder.amount || 0,
            username: (cachedOrder.username || "Supporter").replace(/^@/, ""),
            transaction_time: cachedOrder.transaction_time || new Date().toISOString(),
            status_code: "201",
            status_message: "Pending verification"
        });
    }

    // If order was never registered and not found in Midtrans, return 404.
    // Do NOT return a fake settlement status!
    return res.status(404).json({
        error: "Transaksi tidak ditemukan atau belum diverifikasi oleh Midtrans.",
        order_id: orderId,
        transaction_status: "not_found",
        status_code: "404"
    });
}