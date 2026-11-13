require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

require('../db/init');

const LOGIN_ID = process.argv[2];
const PASSWORD = process.argv[3];
const FULL_NAME = process.argv[4] || 'Admin';

if (!LOGIN_ID || !PASSWORD) {
  console.error('Usage: node seed-admin.js <loginId> <password> [fullName]');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const userId = uuidv4();
  const profileId = uuidv4();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(LOGIN_ID);
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?").run(hash, LOGIN_ID);
    console.log(`Updated existing user "${LOGIN_ID}" → role set to admin.`);
  } else {
    db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run(userId, LOGIN_ID, hash);
    db.prepare("INSERT INTO profiles (id, user_id, full_name) VALUES (?, ?, ?)").run(profileId, userId, FULL_NAME);
    console.log(`Admin user "${LOGIN_ID}" created successfully.`);
  }
})();
