const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { period } = req.query;

  const users = db.prepare(`SELECT u.id, p.full_name, p.avatar_url, p.job_title, p.department
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.is_active=1 AND u.role != 'admin'`).all();

  const rows = users.map(u => {
    const targetQ = period
      ? db.prepare('SELECT * FROM member_targets WHERE user_id=? AND period=?').get(u.id, period)
      : db.prepare('SELECT * FROM member_targets WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(u.id);

    const wonDeals = db.prepare(`SELECT COUNT(*) as c, SUM(value) as rev FROM deals
      WHERE owner_id=? AND stage='won'`).get(u.id);

    const totalDeals = db.prepare(`SELECT COUNT(*) as c FROM deals WHERE owner_id=? AND stage NOT IN ('prospect')`).get(u.id);

    const revenue = wonDeals.rev || 0;
    const targetRev = targetQ?.target_revenue || 0;
    const attainment = targetRev > 0 ? Math.round((revenue / targetRev) * 100) : null;

    return {
      user: u,
      revenue,
      deals_won: wonDeals.c || 0,
      total_deals: totalDeals.c || 0,
      win_rate: totalDeals.c > 0 ? Math.round(((wonDeals.c || 0) / totalDeals.c) * 100) : 0,
      target_revenue: targetRev,
      attainment,
    };
  });

  rows.sort((a, b) => b.revenue - a.revenue);
  rows.forEach((r, i) => r.rank = i + 1);
  res.json(rows);
});

module.exports = router;
