// @ts-nocheck
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    return res.status(500).json({ error: "MIDTRANS_SERVER_KEY belum diset di Vercel." });
  }

  try {
    const body = req.body;
    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount < 1000 || amount > 10000000) {
      return res.status(400).json({ error: "Nominal harus antara Rp1.000 dan Rp10.000.000." });
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
          gross_amount: amount
        },
        callbacks: {
          finish: "https://gepa-we-vercel-version.vercel.app/"
        }
      })
    });

    const data = await midtransResponse.json();

    if (!midtransResponse.ok) {
      console.error("Midtrans API error:", data);
      return res.status(midtransResponse.status).json({
        error: data.error_messages?.join(" ") || "Midtrans menolak transaksi.",
        detail: data
      });
    }

    return res.status(200).json({
      order_id: orderId,
      token: data.token,
      redirect_url: data.redirect_url
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan saat membuat pembayaran." });
  }
}
