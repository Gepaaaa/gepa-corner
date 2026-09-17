// @ts-nocheck

/* =========================================================
   GEPA - CREATE PAYMENT
   Midtrans Snap + Secure Payment Session
   Support: Guest (anonymous) & Authenticated User Donations
========================================================= */

import crypto from "crypto";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        
        // Try to verify user from JWT (Authorization header)
        let userId = null;
        let authenticatedUsername = null;
        
        const authHeader = req.headers.authorization;
        if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
                const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                
                if (user && !error) {
                    userId = user.id;
                    
                    // Query profile untuk dapatkan username authenticated user
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('username')
                        .eq('id', userId)
                        .single();
                    
                    if (profile && profile.username) {
                        authenticatedUsername = profile.username;
                    }
                }
            } catch (authErr) {
                console.warn("Auth verification failed (continuing as guest):", authErr.message);
                // Continue sebagai guest jika auth gagal
            }
        }

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
           DETERMINE USERNAME
           
           Prioritas:
           1. Username dari authenticated user (verified via JWT)
           2. Username dari request body (guest)
           3. Default "Anonim"
        ================================================= */
        const cleanUsername =
            authenticatedUsername ||
            (typeof username === "string" &&
            username.trim()
                ? username
                    .trim()
                    .substring(0, 15)
                : "Anonim");

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
                            
                            // Store user_id jika authenticated (untuk webhook)
                            ...(userId && { custom_field2: userId }),

                            callbacks: {
                                finish:
                                    "https://gepacorner.my.id/",

                                error:
                                    "https://gepacorner.my.id/",

                                pending:
                                    "https://gepacorner.my.id/"
                            },

                            /* =================================
                               GOPAY CALLBACK
                               =================================
                               Setelah pembayaran GoPay selesai
                               melalui deeplink, GoPay akan
                               mengembalikan user ke website ini.

                               Midtrans akan menambahkan:
                               ?order_id=...&result=success
                               atau failure/abort.
                            */
                            gopay: {
                                enable_callback:
                                    true,

                                callback_url:
                                    "https://gepacorner.my.id/"
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
