import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables if .env is present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware for parsing JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API route handlers
import createPaymentHandler from './api/create-payment.mjs';
import checkPaymentHandler from './api/check-payment.mjs';
import rankingHandler from './api/ranking.js';
import userDonationsHandler from './api/user-donations.mjs';
import usernameLoginHandler from './api/username-login.mjs';
import webhookHandler from './api/webhook.js';
import authHandler from './api/auth.mjs';

// API Routes
app.all('/api/auth', (req, res) => authHandler(req, res));
app.all('/api/create-payment', (req, res) => createPaymentHandler(req, res));
app.all('/api/check-payment', (req, res) => checkPaymentHandler(req, res));
app.all('/api/ranking', (req, res) => rankingHandler(req, res));
app.all('/api/user-donations', (req, res) => userDonationsHandler(req, res));
app.all('/api/username-login', (req, res) => usernameLoginHandler(req, res));
app.all('/api/webhook', (req, res) => webhookHandler(req, res));

// Serve static frontend assets
app.use(express.static(__dirname));

// Serve index.html for all other unmatched GET requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
