import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API handlers
  const { default: authHandler } = await import('./api/auth.mjs');
  const { default: musicSearchHandler } = await import('./api/music-search.mjs');
  const { default: createPaymentHandler } = await import('./api/create-payment.mjs');
  const { default: checkPaymentHandler } = await import('./api/check-payment.mjs');
  const { default: rankingHandler } = await import('./api/ranking.js');
  const { default: userDonationsHandler } = await import('./api/user-donations.mjs');
  const { default: usernameLoginHandler } = await import('./api/username-login.mjs');
  const { default: webhookHandler } = await import('./api/webhook.js');
  const { default: uploadLogoHandler } = await import('./api/upload-logo.mjs');

  app.all('/api/auth', (req, res) => authHandler(req, res));
  app.all('/api/music-search', (req, res) => musicSearchHandler(req, res));
  app.all('/api/create-payment', (req, res) => createPaymentHandler(req, res));
  app.all('/api/check-payment', (req, res) => checkPaymentHandler(req, res));
  app.all('/api/ranking', (req, res) => rankingHandler(req, res));
  app.all('/api/user-donations', (req, res) => userDonationsHandler(req, res));
  app.all('/api/username-login', (req, res) => usernameLoginHandler(req, res));
  app.all('/api/webhook', (req, res) => webhookHandler(req, res));
  app.all('/api/upload-logo', (req, res) => uploadLogoHandler(req, res));

  // Serve static assets
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
