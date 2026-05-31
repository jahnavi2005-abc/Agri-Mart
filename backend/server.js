import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';

import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';
import uploadRoutes from './routes/uploads.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import webhookRoutes from './routes/webhooks.js';
import cartRoutes from './routes/cart.js';
import reviewRoutes from './routes/reviews.js';
import disputeRoutes from './routes/disputes.js';
import wishlistRoutes from './routes/wishlist.js';
import payoutRoutes from './routes/payouts.js';
import kycRoutes from './routes/kyc.js';
import auctionRoutes from './routes/auctions.js';
import enquiryRoutes from './routes/enquiries.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://agrimart.vercel.app',
    /\.vercel\.app$/,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
});

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts — please wait 15 minutes.' },
});

app.use(generalLimit);
app.use('/api/auth/login', authLimit);
app.use('/api/auth/signup', authLimit);

// ─── Request logger ───────────────────────────────────────────────────────────
import pinoHttp from 'pino-http';
import pino from 'pino';
import analyticsRoutes from './routes/analytics.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
// Disable automatic request/response logging to avoid cluttering the terminal with JSON logs on every API hit
app.use(pinoHttp({ logger, autoLogging: false }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Config ───────────────────────────────────────────────────────────────────
app.get('/api/config', (_req, res) => {
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'AgriMart Backend running' });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  req.log.error({ err }, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`AgriMart backend listening on port ${PORT}`);
});
