require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Please try again in 15 minutes.' } });
const otpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many OTP requests. Please try again in 1 hour.' } });

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/request-otp', otpLimiter);
app.use('/api/auth/forgot-password', otpLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/appreciations', require('./routes/appreciations'));
app.use('/api/events', require('./routes/events'));
app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/admin', require('./routes/adminData'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/onboarding', require('./routes/onboarding'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
