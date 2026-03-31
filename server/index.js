require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const apiRoutes = require('./routes/api');
const sqlite = require('./sqlite_async');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render, etc.)
const PORT = process.env.PORT || 3001;

// --------------- CORS ---------------
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, true); // permissive for free-tier
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

// --------------- Boot sequence ---------------
async function boot() {
  // 1) Wait for DB schema + migrations to finish
  await sqlite.ready;
  console.log('✅ DB ready');

  // 2) Seed admin if none exists
  try {
    const row = await sqlite.getAsync('SELECT id, email FROM users WHERE isAdmin=1');
    if (!row) {
      const hash = await bcrypt.hash('Bronco2026!', 10);
      await sqlite.runAsync(
        'INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, 1)',
        ['Admin', 'admin@bronco.com', hash]
      );
      console.log('✅ Admin seeded: admin@bronco.com');
    } else {
      console.log('✅ Admin exists: ' + row.email + ' (id=' + row.id + ')');
    }
  } catch (e) {
    console.error('❌ Seed error:', e.message);
  }

  // 3) Start HTTP server
  app.listen(PORT, () => {
    console.log(`🤠 BRONCO API running on port ${PORT}`);
  });
}

boot().catch(err => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
