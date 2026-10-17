import fs from 'fs';
import path from 'path';

export default async function uploadLogoHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Data gambar tidak valid atau kosong' });
    }

    // Extract base64 payload
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Ukuran file gambar kosong' });
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Ukuran logo maksimal 10MB' });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const rootDir = process.cwd();

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write primary custom logo
    const publicLogoPath = path.join(publicDir, 'custom-logo.png');
    const rootLogoPath = path.join(rootDir, 'custom-logo.png');
    fs.writeFileSync(publicLogoPath, buffer);
    fs.writeFileSync(rootLogoPath, buffer);

    // Also copy to apple-touch-icon and high-res favicons if valid PNG
    const touchPath = path.join(publicDir, 'apple-touch-icon.png');
    fs.writeFileSync(touchPath, buffer);
    fs.writeFileSync(path.join(rootDir, 'apple-touch-icon.png'), buffer);

    // Also update favicon-192x192.png and favicon-512x512.png
    fs.writeFileSync(path.join(publicDir, 'favicon-192x192.png'), buffer);
    fs.writeFileSync(path.join(rootDir, 'favicon-192x192.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'favicon-512x512.png'), buffer);
    fs.writeFileSync(path.join(rootDir, 'favicon-512x512.png'), buffer);

    return res.status(200).json({
      success: true,
      message: 'Logo berhasil disimpan dan diatur sebagai logo website!',
      url: '/custom-logo.png?v=' + Date.now()
    });
  } catch (err) {
    console.error('Error saving custom logo:', err);
    return res.status(500).json({ error: 'Gagal memproses dan menyimpan file logo di server' });
  }
}
