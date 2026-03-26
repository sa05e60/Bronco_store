// Switch between MySQL and SQLite by changing the require below
// const db = require('./db'); // MySQL
const db = require('./db_sqlite'); // SQLite

module.exports = db;
