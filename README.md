# Gepa — Personal Corner (React & Vite)

Personal website and cozy corner for Gepa featuring links, profile information, interactive audio player, supporter ranking, and Midtrans donations.

---

## ✨ Features

- 👋 **Personal Introduction & Hero:** Bio, social media channels, and interactive photo carousel.
- 👤 **About Section:** Story, quote, and interactive clickable cards for real-time age, location (Bogor map), and hobbies.
- ⏱️ **Real-Time Age Ticker:** Live counter displaying exact years, months, days, hours, minutes, and seconds.
- 🔗 **Links Section:** Direct channels to WhatsApp Channel, Instagram, and TikTok.
- ☕ **Support & Donation System:** Predefined & custom Rupiah amounts with Midtrans Snap integration, invoice tracking, and receipt printing.
- 🏆 **Supporter Leaderboard:** Daily, weekly, and lifetime rankings with supporter tiers and avatars.
- 🎧 **Online Music Player:** Floating draggable vinyl widget with background YouTube audio engine, iTunes catalog search, and curated Indonesian & lo-fi playlists.
- 🔐 **Account & Auth System:** Login, registration with avatar selector, self-service password recovery, profile editing, and donation history dashboard.
- 🌙 **Dark/Light Mode:** Full dark mode support persisted in local storage.

---

## 🛠️ Built With

- **React 19 & TypeScript**
- **Vite**
- **Express Backend (`server.ts`)** for API routes (`/api/auth`, `/api/ranking`, `/api/create-payment`, `/api/music-search`, etc.)
- **Midtrans Snap & Supabase** integration with resilient in-memory fallbacks

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
