export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Pastikan environment variable tersedia
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error(
            'SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset.'
        );

        return res.status(500).json({
            error: 'Server configuration error'
        });
    }

    try {
        // ==========================================
        // 1. AMBIL TRANSAKSI SUKSES DARI SUPABASE
        // ==========================================

        const response = await fetch(
            `${supabaseUrl}/rest/v1/donations?status=in.(settlement,capture)&select=order_id,username,amount,transaction_time&order=transaction_time.desc`,
            {
                method: 'GET',

                headers: {
                    'apikey': supabaseServiceRoleKey,
                    'Authorization':
                        `Bearer ${supabaseServiceRoleKey}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                'Supabase ranking error:',
                response.status,
                errorText
            );

            return res.status(500).json({
                error: 'Gagal mengambil data ranking'
            });
        }

        const transactions = await response.json();

        // ==========================================
        // 2. WAKTU SEKARANG
        // ==========================================

        const now = new Date();

        // ==========================================
        // 3. HELPER WAKTU INDONESIA (WIB)
        // ==========================================

        const getWIBParts = (date) => {
            const formatter = new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone: 'Asia/Jakarta',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            );

            const parts = formatter.formatToParts(date);

            const result = {};

            parts.forEach(part => {
                if (part.type !== 'literal') {
                    result[part.type] = Number(part.value);
                }
            });

            return result;
        };

        const nowWIB = getWIBParts(now);

        // ==========================================
        // 4. CEK HARI INI
        // ==========================================

        const isToday = (dateStr) => {
            const d = new Date(dateStr);
            const parts = getWIBParts(d);

            return (
                parts.year === nowWIB.year &&
                parts.month === nowWIB.month &&
                parts.day === nowWIB.day
            );
        };

        // ==========================================
        // 5. CEK MINGGU INI
        // Senin → Minggu
        // ==========================================

        const getWIBDate = (date) => {
            const parts = getWIBParts(date);

            return new Date(
                Date.UTC(
                    parts.year,
                    parts.month - 1,
                    parts.day
                )
            );
        };

        const todayWIB = getWIBDate(now);

        // JavaScript:
        // 0 = Minggu
        // 1 = Senin
        // ...
        // 6 = Sabtu

        const day = todayWIB.getUTCDay();

        // Ubah Minggu menjadi 7
        const dayNumber = day === 0 ? 7 : day;

        // Cari hari Senin minggu ini
        const startOfWeek = new Date(todayWIB);

        startOfWeek.setUTCDate(
            todayWIB.getUTCDate() -
            dayNumber +
            1
        );

        const isThisWeek = (dateStr) => {
            const transactionDate =
                getWIBDate(new Date(dateStr));

            return transactionDate >= startOfWeek;
        };

        // ==========================================
        // 6. PENGELOMPOKAN RANKING
        // ==========================================

        const aggregateData = (txList) => {
            const map = {};

            txList.forEach(tx => {
                const username =
                    typeof tx.username === 'string' &&
                    tx.username.trim()
                        ? tx.username.trim()
                        : 'Anonim';

                if (!map[username]) {
                    map[username] = {
                        username: username,
                        totalAmount: 0,
                        txCount: 0
                    };
                }

                map[username].totalAmount +=
                    Number(tx.amount) || 0;

                map[username].txCount += 1;
            });

            return Object.values(map).sort(
                (a, b) =>
                    b.totalAmount - a.totalAmount
            );
        };

        // ==========================================
        // 7. FILTER TRANSAKSI
        // ==========================================

        const dailyTx =
            transactions.filter(tx =>
                isToday(tx.transaction_time)
            );

        const weeklyTx =
            transactions.filter(tx =>
                isThisWeek(tx.transaction_time)
            );

        const lifetimeTx = transactions;

        // ==========================================
        // 8. KIRIM HASIL KE WEBSITE
        // ==========================================

        return res.status(200).json({
            daily: aggregateData(dailyTx),
            weekly: aggregateData(weeklyTx),
            lifetime: aggregateData(lifetimeTx)
        });

    } catch (error) {
        console.error(
            'Ranking error:',
            error
        );

        return res.status(500).json({
            error: 'Terjadi kesalahan server'
        });
    }
}