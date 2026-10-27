import { getProfileData } from '../../../lib/services/profile';

/**
 * Next.js App Router Route Handler: GET /api/profile
 */
export async function GET() {
  try {
    const data = await getProfileData();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Gagal mengambil data profil' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
