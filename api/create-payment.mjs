// @ts-nocheck

/* =========================================================
   GEPA - CREATE PAYMENT
   Midtrans Snap + Secure Payment Session
========================================================= */

import crypto from "crypto";

export default async function handler(req, res) {

    /* =====================================================
       METHOD CHECK
    ===================================================== */
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);

        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    /* =====================================================
       ENVIRONMENT VARIABLES
    ===================================================== */
    const serverKey =
        process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
        console.error(
            "MIDTRANS_SERVER_KEY belum diset."
        );

        return res.status(500).json({
            error:
                "MIDTRANS_SERVER_KEY belum diset."
        });
    }

    /* =====================================================
       MAIN PROCESS
    ===================================================== */
    try {

        const {
            amount,
            username
        } = req.body || {};

        const numAmount =
            Number(amount);

        /* =================================================
           VALIDATE AMOUNT
        ================================================= */
        if (
            !Number.isInteger(numAmount) ||
            numAmount < 1000 ||
            numAmount > 10000000
        ) {
            return res.status(400).json({
                error:
                    "Nominal tidak valid."
            });
        }

        /* =================================================
           CLEAN USERNAME
        ================================================= */
        const cleanUsername =
            typeof username === "string" &&
            username.trim()
                ? username
                    .trim()
                    .substring(0, 15)
                : "Anonim";

        /* =================================================
           GENERATE ORDER ID
        ================================================= */
        const orderId =
            `GEPA-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)
                .toUpperCase()}`;

        /* =================================================
           GENERATE PRIVATE SESSION TOKEN

           Token ini tidak disimpan di database.

           Token dibuat menggunakan HMAC dengan
           MIDTRANS_SERVER_KEY sehingga orang yang hanya
           mengetahui order_id tidak bisa membuat token
           yang valid sendiri.
        ================================================= */
        const sessionToken =
            crypto
                .createHmac(
                    "sha256",
                    serverKey
                )
                .update(
                    `GEPA-PAYMENT:${orderId}`
                )
                .digest("hex");

        /* =================================================
           MIDTRANS AUTH
        ================================================= */
        const auth =
            Buffer
                .from(`${serverKey}:`)
                .toString("base64");

        /* =================================================
           CREATE MIDTRANS TRANSACTION
        ================================================= */
        const midtransResponse =
            await fetch(
                "https://app.sandbox.midtrans.com/snap/v1/transactions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Basic ${auth}`
                    },

                    body:
                        JSON.stringify({
                            transaction_details: {
                                order_id:
                                    orderId,

                                gross_amount:
                                    numAmount
                            },

                            customer_details: {
                                first_name:
                                    cleanUsername
                            },

                            custom_field1:
                                cleanUsername,

                            callbacks: {
                                finish:
                                    "https://gepa-we-vercel-version.vercel.app/",

                                error:
                                    "https://gepa-we-vercel-version.vercel.app/",

                                pending:
                                    "https://gepa-we-vercel-version.vercel.app/"
                            }
                        })
                }
            );

        const data =
            await midtransResponse.json();

        /* =================================================
           MIDTRANS ERROR
        ================================================= */
        if (!midtransResponse.ok) {

            console.error(
                "Midtrans create transaction error:",
                midtransResponse.status,
                data
            );

            return res.status(
                midtransResponse.status
            ).json({
                error:
                    data.status_message ||
                    "Gagal membuat transaksi."
            });
        }

        /* =================================================
           SUCCESS
        ================================================= */
        console.log(
            `Payment created: ${orderId} | ${cleanUsername} | Rp${numAmount}`
        );

        return res.status(200).json({

            order_id:
                orderId,

            token:
                data.token,

            /*
             * Token ini dikirim hanya kepada browser
             * yang membuat payment.
             */
            session_token:
                sessionToken

        });

    } catch (error) {

        console.error(
            "Create payment error:",
            error
        );

        return res.status(500).json({
            error:
                "Terjadi kesalahan server."
        });
    }
}