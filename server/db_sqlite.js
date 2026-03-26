// SQLite database initialization for Bronco
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bronco.sqlite');
const schemaPath = path.join(__dirname, 'bronco.sqlite.sql');

const db = new sqlite3.Database(dbPath);

const fs = require('fs');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
  if (err) {
    console.error('Failed to initialize SQLite schema:', err);
  } else {
    console.log('SQLite DB initialized.');
  }
});

module.exports = db;
