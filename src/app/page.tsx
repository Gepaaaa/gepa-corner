import React from 'react';
import { getProfileData } from '../lib/services/profile';
import { getLeaderboardData } from '../lib/services/leaderboard';
import MainApp from '../App';

/**
 * Next.js App Router Server Component (Page).
 * Performs server-side data fetching for profile and leaderboard
 * so pages render instantly with zero client-side fetching waterfall.
 */
export default async function Page() {
  const [profileData, leaderboardData] = await Promise.all([
    getProfileData(),
    getLeaderboardData()
  ]);

  return (
    <main>
      {/* Server-Rendered Hidden SEO Micro-markup for Search Engine Bots */}
      <section className="sr-only" aria-hidden="true" style={{ display: 'none' }}>
        <h1>{profileData.name} — Personal Corner</h1>
        <p>{profileData.eyebrow}</p>
        <p>{profileData.aboutStory.join(' ')}</p>
        <div>
          <h2>Papan Peringkat Pendukung (Leaderboard)</h2>
          <ul>
            {leaderboardData.lifetime.slice(0, 10).map((item, idx) => (
              <li key={idx}>
                {idx + 1}. {item.username} - Rp {new Intl.NumberFormat('id-ID').format(item.totalAmount)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Main Hydrated Interactive Application */}
      <MainApp
        initialProfile={profileData}
        initialLeaderboard={leaderboardData}
      />
    </main>
  );
}
