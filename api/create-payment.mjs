// @ts-nocheck
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return res.status(500).json({ error: "MIDTRANS_SERVER_KEY belum diset." });
  }

  try {
    const { amount, username } = req.body;
    const numAmount = Number(amount);
    const cleanUsername = username ? username.trim().substring(0, 15) : "Anonim";

    if (!Number.isInteger(numAmount) || numAmount < 1000 || numAmount > 10000000) {
      return res.status(400).json({ error: "Nominal tidak valid." });
    }

    const orderId = `GEPA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const midtransResponse = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: numAmount
        },
        customer_details: {
          first_name: cleanUsername
        },
        custom_field1: cleanUsername,
        
        // KITA KEMBALIKAN CALLBACKS AGAR BALIK KE WEB LU (BUKAN EXAMPLE.COM)
        callbacks: {
          finish: "https://gepa-we-vercel-version.vercel.app/",
          error: "https://gepa-we-vercel-version.vercel.app/",
          pending: "https://gepa-we-vercel-version.vercel.app/"
        }
      })
    });

    const data = await midtransResponse.json();

    if (!midtransResponse.ok) {
      return res.status(midtransResponse.status).json({ error: "Gagal membuat transaksi." });
    }

    return res.status(200).json({
      order_id: orderId,
      token: data.token
    });
  } catch (error) {
    return res.status(500).json({ error: "Terjadi kesalahan server." });
  }
}
