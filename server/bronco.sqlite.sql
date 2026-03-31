-- SQLite DB schema for Bronco
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT,
  value INTEGER,
  label TEXT,
  minSubtotalCents INTEGER,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  uid INTEGER,
  items TEXT,
  totals TEXT,
  customer TEXT,
  status TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT,
  priceCents INTEGER,
  img TEXT,
  category TEXT,
  details TEXT,
  stock INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  password TEXT,
  honorPoints INTEGER DEFAULT 0,
  bounty INTEGER DEFAULT 0,
  profilePic TEXT,
  address TEXT,
  auth_token TEXT,
  token_expires TEXT,
  reset_token TEXT,
  reset_expires TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  isAdmin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  message TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
