# Gepa — Personal Corner

Website personal dan *cozy corner* untuk Gepa yang memuat informasi profil, tautan media sosial, pemutar musik online, papan peringkat donatur (*leaderboard*), sistem akun pengguna, dan integrasi donasi Midtrans.

---

## ✨ Fitur Utama

- 👋 **Personal Introduction & Hero:** Bio, kanal media sosial, dan carousel foto interaktif.
- 👤 **About Section:** Cerita, kutipan, dan kartu interaktif untuk usia realtime, peta lokasi (Bogor), serta hobi (Mobile Legends & kurasi film elitis Letterboxd).
- ⏱️ **Real-Time Age Ticker:** Penghitung usia langsung yang menampilkan tahun, bulan, hari, jam, menit, dan detik.
- 🔗 **Links Section:** Akses langsung ke WhatsApp Channel, Instagram, dan TikTok.
- ☕ **Support & Donation System:** Pilihan nominal donasi fleksibel via Midtrans Snap, pelacakan invoice resmi, dan cetak struk pembayaran.
- 🏆 **Supporter Leaderboard:** Peringkat donatur harian, mingguan, dan sepanjang waktu (*lifetime*) dengan avatar terverifikasi.
- 🎧 **Online Music Player:** Widget pemutar musik melayang (*draggable vinyl widget*) dengan engine audio YouTube di latar belakang dan playlist kurasi.
- 🔐 **Account & Security System:** Autentikasi aman berbasis Supabase & token Bearer, manajemen profil, riwayat donasi terproteksi, dan ganti password terverifikasi.
- 🌙 **Dark/Light Mode:** Dukungan tema gelap/terang yang tersimpan otomatis di perangkat.

---

## 🛠️ Arsitektur & Teknologi

- **Frontend:**
  - Halaman interaktif berperforma tinggi dengan HTML5, CSS3, dan Vanilla JavaScript (`script.js`, `style.css`).
  - Arsitektur berbasis komponen **React 19 & TypeScript** di dalam direktori `src/` (terstruktur siap migrasi ke Next.js App Router).
- **Backend & Server-Side:**
  - Server Full-Stack **Node.js & Express (`server.ts`)** yang menyajikan API terpadu serta **Server-Side Rendering (SSR)** untuk injeksi awal data profil dan peringkat pendukung (`__INITIAL_DATA__`).
- **Database & Payment:**
  - **Supabase (PostgreSQL):** Penyimpanan permanen akun pengguna, profil, dan riwayat transaksi donasi.
  - **Midtrans Payment Gateway:** Integrasi Snap API dengan verifikasi status pembayaran langsung di sisi server (*server-to-server verification*) dan validasi signature SHA-512 webhook.

---

## 🔒 Kebijakan Keamanan (Security Hardening)

1. **Anti-Spoofing Status Pembayaran (`/api/check-payment`):**
   - Status transaksi hanya diakui setelah diverifikasi langsung ke server Midtrans API menggunakan `MIDTRANS_SERVER_KEY` atau webhook terverifikasi.
   - Status `settlement` yang dikirim dari browser tidak lagi dipercaya secara membabi-buta oleh server.
2. **Proteksi Akun & Ganti Password (`/api/auth`):**
   - Aksi `change-password` mewajibkan token Bearer yang valid dan verifikasi password lama sebelum password baru diterapkan di database.
   - Aksi `me` hanya mengembalikan data sensitif (email, nomor telepon) milik pengguna yang memegang token otentikasi sah.
   - Tersedia endpoint publik `public-profile` yang telah disanitasi (hanya mengembalikan username, avatar, dan bio publik tanpa data sensitif).
3. **Privasi Riwayat Donasi (`/api/user-donations`):**
   - Riwayat donasi dan nomor invoice diproteksi ketat dan hanya dapat diakses oleh pemilik akun yang bersangkutan melalui token terotentikasi.
4. **Dukungan Lingkungan Midtrans (Sandbox & Production):**
   - Beralih secara otomatis antara Sandbox (`app.sandbox.midtrans.com` / `api.sandbox.midtrans.com`) dan Production (`app.midtrans.com` / `api.midtrans.com`) melalui variabel lingkungan `MIDTRANS_IS_PRODUCTION=true`.

---

## 🚀 Menjalankan Proyek Secara Lokal

```bash
# 1. Install seluruh dependensi
npm install

# 2. Jalankan development server
npm run dev

# 3. Jalankan build produksi
npm run build
```

---

## ⚙️ Variabel Lingkungan (.env)

| Variabel | Deskripsi |
| :--- | :--- |
| `MIDTRANS_SERVER_KEY` | Server Key resmi dari dashboard Midtrans |
| `MIDTRANS_CLIENT_KEY` | Client Key resmi dari dashboard Midtrans |
| `MIDTRANS_IS_PRODUCTION` | Set `true` untuk mode Production, `false` untuk Sandbox |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase untuk operasi database server |
| `PORT` | Port server (default: 3000) |
