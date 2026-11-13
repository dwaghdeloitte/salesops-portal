const fs = require('fs');
const path = require('path');
const db = require('./index');

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
for (const stmt of statements) {
  try { db.prepare(stmt).run(); } catch (e) { console.error('Schema error:', e.message); }
}
console.log('Database initialised at', db.name);
