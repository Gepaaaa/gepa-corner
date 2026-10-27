import { RankingData, RankingItem } from '../../types';

function getWIBDate(date = new Date()): Date {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
}

/**
 * Server-Side Leaderboard & Supporter Ranking Data Provider.
 * Usable directly inside Next.js App Router (Server Components / Route Handlers)
 * and in Express SSR middleware.
 */
export async function getLeaderboardData(): Promise<RankingData> {
  const supabaseUrl = process.env.SUPABASE_URL || "https://dkybfxbhlwyrjcycpatp.supabase.co";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let transactions: Array<{
    username?: string;
    avatar?: string;
    amount?: number | string;
    gross_amount?: number | string;
    transaction_time?: string;
    status?: string;
  }> = [];

  const profileAvatarMap = new Map<string, string>();

  if (supabaseUrl && supabaseServiceRoleKey) {
    try {
      // 1. Fetch profiles for official avatars
      const profRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=id,username,avatar_url`,
        {
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`
          }
        }
      );
      if (profRes.ok) {
        const profData = await profRes.json();
        if (Array.isArray(profData)) {
          profData.forEach((p: { username?: string; avatar_url?: string }) => {
            if (p?.username && p?.avatar_url) {
              const clean = String(p.username).trim().replace(/^@/, '').toLowerCase();
              profileAvatarMap.set(clean, p.avatar_url);
            }
          });
        }
      }

      // 2. Fetch avatar records from donations
      const avRes = await fetch(
        `${supabaseUrl}/rest/v1/donations?order_id=like.AVATAR_USER_*&select=username,status`,
        {
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`
          }
        }
      );
      if (avRes.ok) {
        const avData = await avRes.json();
        if (Array.isArray(avData)) {
          avData.forEach((row: { username?: string; status?: string }) => {
            if (row?.username && row?.status) {
              const clean = String(row.username).trim().replace(/^@/, '').toLowerCase();
              if (!profileAvatarMap.has(clean)) {
                profileAvatarMap.set(clean, row.status);
              }
            }
          });
        }
      }

      // 3. Fetch successful donation transactions
      const txRes = await fetch(
        `${supabaseUrl}/rest/v1/donations?order_id=not.like.AVATAR_USER_*&status=in.(settlement,capture,success)&select=username,amount,gross_amount,transaction_time,status,avatar`,
        {
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`
          }
        }
      );
      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData)) {
          transactions = txData;
        }
      }
    } catch (err) {
      console.warn('Leaderboard server fetch warning:', err);
    }
  }

  // Fallback seed data if no transactions in database yet
  if (!transactions || transactions.length === 0) {
    transactions = [
      {
        username: 'Kinan S.',
        amount: 50000,
        transaction_time: new Date().toISOString(),
        avatar: '☕'
      },
      {
        username: 'Budi Santoso',
        amount: 25000,
        transaction_time: new Date().toISOString(),
        avatar: '✨'
      },
      {
        username: 'Anonim Baik',
        amount: 15000,
        transaction_time: new Date().toISOString(),
        avatar: '🌟'
      }
    ];
  }

  const nowWIB = getWIBDate(new Date());
  const startOfDay = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate());
  
  const currentDayOfWeek = nowWIB.getDay();
  const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const startOfWeek = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), nowWIB.getDate() - diffToMonday);

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const d = getWIBDate(new Date(dateStr));
      return d >= startOfDay;
    } catch {
      return false;
    }
  };

  const isThisWeek = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const d = getWIBDate(new Date(dateStr));
      return d >= startOfWeek;
    } catch {
      return false;
    }
  };

  const aggregate = (txList: typeof transactions): RankingItem[] => {
    const map: Record<string, RankingItem> = {};

    txList.forEach(tx => {
      const rawUser = typeof tx.username === 'string' && tx.username.trim()
        ? tx.username.trim().replace(/^@/, '')
        : 'Anonim';
      const key = rawUser.toLowerCase();

      if (!map[key]) {
        map[key] = {
          username: rawUser,
          avatar: tx.avatar || profileAvatarMap.get(key) || '✨',
          totalAmount: 0,
          txCount: 0
        };
      }

      const amt = Number(tx.amount || tx.gross_amount) || 0;
      map[key].totalAmount += amt;
      map[key].txCount += 1;

      if (profileAvatarMap.has(key)) {
        map[key].avatar = profileAvatarMap.get(key);
      }
    });

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  const daily = aggregate(transactions.filter(tx => isToday(tx.transaction_time)));
  const weekly = aggregate(transactions.filter(tx => isThisWeek(tx.transaction_time)));
  const lifetime = aggregate(transactions);

  return {
    daily,
    weekly,
    lifetime
  };
}
