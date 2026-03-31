// SQLite database initialization for Bronco
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'bronco.sqlite');
const schemaPath = path.join(__dirname, 'bronco.sqlite.sql');

const db = new sqlite3.Database(dbPath);
const schema = fs.readFileSync(schemaPath, 'utf8');

// Promise that resolves when the DB is fully ready
const ready = new Promise((resolve, reject) => {
  db.serialize(() => {
    // 1) Run the CREATE TABLE IF NOT EXISTS statements
    db.exec(schema, (err) => {
      if (err) console.error('Schema error:', err.message);
    });

    // 2) Add missing columns for older databases (errors are expected & ignored)
    const migrations = [
      'ALTER TABLE users ADD COLUMN phone TEXT',
      'ALTER TABLE users ADD COLUMN address TEXT',
      'ALTER TABLE users ADD COLUMN auth_token TEXT',
      'ALTER TABLE users ADD COLUMN token_expires TEXT',
      'ALTER TABLE users ADD COLUMN reset_token TEXT',
      'ALTER TABLE users ADD COLUMN reset_expires TEXT',
    ];
    migrations.forEach(sql => {
      db.run(sql, () => {}); // ignore "duplicate column" errors
    });

    // 3) Final no-op to ensure everything above has finished
    db.run('SELECT 1', () => {
      console.log('SQLite DB initialized.');
      resolve();
    });
  });
});

db.ready = ready;
module.exports = db;
