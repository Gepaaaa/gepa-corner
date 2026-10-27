import { getLeaderboardData } from '../../../lib/services/leaderboard';

/**
 * Next.js App Router Route Handler: GET /api/ranking
 */
export async function GET() {
  try {
    const data = await getLeaderboardData();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Gagal mengambil data peringkat' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
