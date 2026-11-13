const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sendOTP } = require('../utils/mailer');
const { auth } = require('../middleware/auth');

const ALLOWED_DOMAIN = 'deloitte.com';

function isStrongPassword(pwd) {
  if (pwd.length < 8) return 'at least 8 characters';
  if (!/[A-Z]/.test(pwd)) return 'at least one uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'at least one lowercase letter';
  if (!/[0-9]/.test(pwd)) return 'at least one number';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'at least one special character';
  return null;
}

function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const normalised = email.trim().toLowerCase();
  const domain = normalised.split('@')[1];
  if (domain !== ALLOWED_DOMAIN) {
    return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalised);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM otps WHERE email = ?").run(normalised);
  db.prepare("INSERT INTO otps (id, email, code, expires_at) VALUES (?, ?, ?, ?)").run(uuidv4(), normalised, code, expiresAt);

  try {
    const { previewUrl } = await sendOTP(normalised, code);
    res.json({ success: true, previewUrl });
  } catch (err) {
    console.error('Email send error:', err.message);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
});

router.post('/register', async (req, res) => {
  const { email, otp, fullName, password } = req.body;
  if (!email || !otp || !fullName || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const normalised = email.trim().toLowerCase();
  const domain = normalised.split('@')[1];
  if (domain !== ALLOWED_DOMAIN) {
    return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });
  }

  const pwdError = isStrongPassword(password);
  if (pwdError) return res.status(400).json({ error: `Password must contain ${pwdError}` });

  const record = db.prepare("SELECT * FROM otps WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1").get(normalised);
  if (!record) return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
  if (record.code !== otp.trim()) return res.status(400).json({ error: 'Incorrect verification code' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalised);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  db.prepare("UPDATE otps SET used = 1 WHERE id = ?").run(record.id);

  const hash = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'member')").run(userId, normalised, hash);
  db.prepare("INSERT INTO profiles (id, user_id, full_name) VALUES (?, ?, ?)").run(uuidv4(), userId, fullName.trim());

  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: fullName.trim() } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const normalised = email.trim().toLowerCase();
  const row = db.prepare('SELECT u.id, u.email, u.role, u.password_hash, u.is_active, p.full_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.email = ?').get(normalised);
  if (!row) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (!row.is_active) return res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
  const token = jwt.sign({ id: row.id, email: row.email, role: row.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: row.id, email: row.email, role: row.role, fullName: row.full_name } });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const normalised = email.trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email=? AND is_active=1').get(normalised);
  if (!user) return res.json({ success: true }); // don't reveal existence
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM password_resets WHERE user_id=?').run(user.id);
  db.prepare('INSERT INTO password_resets (id,user_id,token,expires_at) VALUES (?,?,?,?)').run(uuidv4(), user.id, token, expires);
  try {
    const { previewUrl } = await sendOTP(normalised, `Password reset token: ${token} (expires in 1 hour)`);
    res.json({ success: true, previewUrl });
  } catch {
    res.json({ success: true, token }); // dev fallback
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password required' });
  const record = db.prepare('SELECT * FROM password_resets WHERE token=? AND used=0').get(token);
  if (!record || new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Invalid or expired token' });
  const pwdError = isStrongPassword(password);
  if (pwdError) return res.status(400).json({ error: `Password must contain ${pwdError}` });
  const hash = await bcrypt.hash(password, 10);
  db.prepare("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?").run(hash, record.user_id);
  db.prepare('UPDATE password_resets SET used=1 WHERE id=?').run(record.id);
  res.json({ success: true });
});

router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  const pwdError = isStrongPassword(newPassword);
  if (pwdError) return res.status(400).json({ error: `New password must contain ${pwdError}` });
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.user.id);
  res.json({ success: true });
});

module.exports = router;
