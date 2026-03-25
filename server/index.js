require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// --------------- CORS ---------------
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, true); // permissive for free-tier — tighten in production
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// --------------- Body parsing ---------------
app.use(express.json({ limit: '5mb' }));

// --------------- Rate limiting ---------------
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// --------------- API routes ---------------
app.use('/api', apiRoutes);

// --------------- Health check ---------------
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'BRONCO API' });
});

// --------------- Start ---------------
app.listen(PORT, () => {
  console.log(`🤠 BRONCO API running on port ${PORT}`);
});
