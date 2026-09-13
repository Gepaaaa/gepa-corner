// Mengambil data dari memory yang sama dengan webhook
if (!global.successfulDonations) {
    global.successfulDonations = [];
}

export default function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const transactions = global.successfulDonations;
    const now = new Date();

    // Helper Filter Tanggal
    const isToday = (dateStr) => {
        const d = new Date(dateStr);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const isThisWeek = (dateStr) => {
        const d = new Date(dateStr);
        const dayOfWeek = now.getDay() || 7; // Sunday is 7
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0,0,0,0);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        return d >= startOfWeek;
    };

    // Helper Pengelompokan Data
    const aggregateData = (txList) => {
        const map = {};
        txList.forEach(tx => {
            if (!map[tx.username]) {
                map[tx.username] = { username: tx.username, totalAmount: 0, txCount: 0 };
            }
            map[tx.username].totalAmount += tx.amount;
            map[tx.username].txCount += 1;
        });
        
        // Convert ke array dan sort dari yang terbesar
        return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
    };

    // Filter Data
    const dailyTx = transactions.filter(tx => isToday(tx.time));
    const weeklyTx = transactions.filter(tx => isThisWeek(tx.time));
    const lifetimeTx = transactions;

    return res.status(200).json({
        daily: aggregateData(dailyTx),
        weekly: aggregateData(weeklyTx),
        lifetime: aggregateData(lifetimeTx)
    });
}
