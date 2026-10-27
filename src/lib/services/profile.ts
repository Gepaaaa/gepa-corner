import { ProfileData } from '../../types';

const BIRTH_DATE = new Date(2006, 4, 17, 0, 0, 0); // May 17, 2006

export function calculateAge(birthDate: Date = BIRTH_DATE): string {
  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    years--;
  }
  return `${years} years`;
}

/**
 * Server-side data provider for Gepa profile.
 * Ready for Next.js App Router Server Component & Express SSR.
 */
export async function getProfileData(): Promise<ProfileData> {
  return {
    name: 'Gepa',
    eyebrow: "Hi, I'm Gepa ✌",
    tagline: 'welcome to my little corner',
    aboutStory: [
      'Hai! Gue Gepa. Anak biasa yang punya banyak rencana, mimpi, dan proses panjang buat jadi versi terbaik dari diri sendiri.',
      'Suka hal-hal simpel, gaming, teknologi, musik, dan hal-hal yang bikin hidup terasa lebih berarti.'
    ],
    quote: 'Bukan tentang jadi yang terbaik, tapi jadi lebih baik dari kemarin. ☺',
    birthDate: '2006-05-17',
    calculatedAge: calculateAge(),
    location: 'Jakarta, Indonesia',
    hobby: 'Gaming & Movies',
    avatarUrl: '/assets/profile-gepa.jpg',
    photos: [
      '/assets/foto-1.jpg',
      '/assets/foto-6.jpg',
      '/assets/foto-2.jpg'
    ]
  };
}
