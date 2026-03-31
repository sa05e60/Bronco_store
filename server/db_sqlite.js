// SQLite database initialization for Bronco
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bronco.sqlite');
const schemaPath = path.join(__dirname, 'bronco.sqlite.sql');

const db = new sqlite3.Database(dbPath);

const fs = require('fs');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Run schema first, then add any missing columns for existing databases
db.exec(schema, (err) => {
  if (err) {
    console.error('Failed to initialize SQLite schema:', err);
  } else {
    console.log('SQLite DB initialized.');
  }

  // Safely add missing columns (ALTER TABLE will fail silently if column exists)
  const missingCols = [
    "ALTER TABLE users ADD COLUMN phone TEXT",
    "ALTER TABLE users ADD COLUMN address TEXT",
    "ALTER TABLE users ADD COLUMN auth_token TEXT",
    "ALTER TABLE users ADD COLUMN token_expires TEXT",
    "ALTER TABLE users ADD COLUMN reset_token TEXT",
    "ALTER TABLE users ADD COLUMN reset_expires TEXT",
  ];
  missingCols.forEach(sql => {
    db.run(sql, () => {}); // ignore errors (column already exists)
  });
});

module.exports = db;
