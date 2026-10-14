// @ts-nocheck

/* =========================================================
   GEPA - CREATE PAYMENT
   Midtrans Snap + Secure Payment Session
   Support: Guest (anonymous) & Authenticated User Donations
========================================================= */

import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';
import { memoryTransactions, saveTransactionsToDisk } from "./transactions.mjs";
import { memoryUsers } from "./auth.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dkybfxbhlwyrjcycpatp.supabase.co";
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
            username,
            avatar
        } = req.body || {};
        
        // Try to verify user from token (Authorization header)
        let userId = null;
        let authenticatedUsername = null;
        
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '').trim();
            // 1. Check local/memory user store
            for (const [_, u] of memoryUsers.entries()) {
                if (u.id === token || u.lastToken === token) {
                    userId = u.id;
                    authenticatedUsername = u.username;
                    break;
                }
            }

            // 2. Fallback to Supabase if not matched in memory
            if (!userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
                try {
                    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
                    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
                    
                    if (user && !error) {
                        userId = user.id;
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
                    console.warn("Supabase auth verification failed:", authErr.message);
                }
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
                                    req.headers.origin ? `${req.headers.origin}/` : (req.headers.referer || "https://gepacorner.my.id/"),

                                error:
                                    req.headers.origin ? `${req.headers.origin}/` : (req.headers.referer || "https://gepacorner.my.id/"),

                                pending:
                                    req.headers.origin ? `${req.headers.origin}/` : (req.headers.referer || "https://gepacorner.my.id/")
                            },

                            /* =================================
                               GOPAY CALLBACK
                               =================================
                               Setelah pembayaran GoPay selesai
                               melalui deeplink, GoPay akan
                               mengembalikan user ke website ini.
                            */
                            gopay: {
                                enable_callback:
                                    true,

                                callback_url:
                                    req.headers.origin ? `${req.headers.origin}/` : (req.headers.referer || "https://gepacorner.my.id/")
                            }
                        })
                }
            );

        const data =
            await midtransResponse.json();

        // Register in shared memory store for fast local invoice syncing
        memoryTransactions.set(orderId, {
            order_id: orderId,
            orderId: orderId,
            gross_amount: numAmount,
            amount: numAmount,
            username: cleanUsername,
            user_id: userId || null,
            avatar: avatar || "✨",
            transaction_status: "pending",
            payment_type: "ONLINE PAYMENT",
            transaction_time: new Date().toISOString()
        });
        saveTransactionsToDisk();

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
