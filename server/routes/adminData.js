const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// ── Sales & Revenue ─────────────────────────────────────────────
router.get('/sales', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM sales_revenue ORDER BY period_start DESC').all();
  res.json(rows);
});

router.post('/sales', auth, adminOnly, (req, res) => {
  const { week_label, period_start, revenue, quota, deals_won, deals_lost, pipeline_value, notes } = req.body;
  if (!week_label || !period_start) return res.status(400).json({ error: 'week_label and period_start are required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO sales_revenue
    (id, week_label, period_start, revenue, quota, deals_won, deals_lost, pipeline_value, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, week_label, period_start, revenue || 0, quota || 0, deals_won || 0, deals_lost || 0, pipeline_value || 0, notes || '', req.user.id);
  res.json(db.prepare('SELECT * FROM sales_revenue WHERE id = ?').get(id));
});

router.put('/sales/:id', auth, adminOnly, (req, res) => {
  const { week_label, period_start, revenue, quota, deals_won, deals_lost, pipeline_value, notes } = req.body;
  db.prepare(`UPDATE sales_revenue SET week_label=COALESCE(?,week_label), period_start=COALESCE(?,period_start),
    revenue=COALESCE(?,revenue), quota=COALESCE(?,quota), deals_won=COALESCE(?,deals_won),
    deals_lost=COALESCE(?,deals_lost), pipeline_value=COALESCE(?,pipeline_value), notes=COALESCE(?,notes)
    WHERE id=?`)
    .run(week_label, period_start, revenue, quota, deals_won, deals_lost, pipeline_value, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM sales_revenue WHERE id=?').get(req.params.id));
});

router.delete('/sales/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM sales_revenue WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Recruitment uploads ─────────────────────────────────────────
router.get('/recruitment', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT id, week_label, week_start, applications, interviews, offers, joiners, notes, created_at FROM recruitment_uploads ORDER BY week_start DESC').all();
  res.json(rows);
});

router.get('/recruitment/:id/html', auth, adminOnly, (req, res) => {
  const row = db.prepare('SELECT html_content FROM recruitment_uploads WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.send(row.html_content);
});

router.post('/recruitment', auth, adminOnly, (req, res) => {
  const { week_label, week_start, html_content, applications, interviews, offers, joiners, notes } = req.body;
  if (!week_label || !week_start || !html_content) return res.status(400).json({ error: 'week_label, week_start, and html_content are required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO recruitment_uploads
    (id, week_label, week_start, html_content, applications, interviews, offers, joiners, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, week_label, week_start, html_content, applications || 0, interviews || 0, offers || 0, joiners || 0, notes || '', req.user.id);
  res.json({ id, week_label, week_start, applications, interviews, offers, joiners, notes });
});

router.delete('/recruitment/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM recruitment_uploads WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Audit log ───────────────────────────────────────────────────
router.get('/audit-log', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all();
  res.json(rows);
});

// ── Member targets ───────────────────────────────────────────────
router.get('/targets', auth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT mt.*, p.full_name, p.avatar_url FROM member_targets mt
    LEFT JOIN profiles p ON p.user_id = mt.user_id ORDER BY mt.period DESC, p.full_name`).all();
  res.json(rows);
});

router.post('/targets', auth, adminOnly, (req, res) => {
  const { user_id, period, target_revenue, target_deals, notes } = req.body;
  if (!user_id || !period) return res.status(400).json({ error: 'user_id and period required' });
  const id = uuidv4();
  db.prepare('INSERT OR REPLACE INTO member_targets (id,user_id,period,target_revenue,target_deals,notes,created_by) VALUES (?,?,?,?,?,?,?)')
    .run(id, user_id, period, target_revenue||0, target_deals||0, notes||'', req.user.id);
  try {
    db.prepare('INSERT INTO notifications (id,user_id,type,title,body) VALUES (?,?,?,?,?)')
      .run(uuidv4(), user_id, 'target', 'Quota target updated', `Your target for ${period} has been set by admin`);
  } catch {}
  auditAction(req.user, 'target.set', `${user_id}/${period}`, `rev=${target_revenue}, deals=${target_deals}`);
  res.json(db.prepare('SELECT * FROM member_targets WHERE user_id=? AND period=?').get(user_id, period));
});

router.delete('/targets/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM member_targets WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── CSV Export ───────────────────────────────────────────────────
router.get('/sales/export', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM sales_revenue ORDER BY period_start').all();
  const header = 'Week,Period Start,Revenue,Quota,Attainment %,Deals Won,Deals Lost,Pipeline Value,Notes';
  const lines = rows.map(r => {
    const att = r.quota > 0 ? Math.round((r.revenue/r.quota)*100) : '';
    return [r.week_label, r.period_start, r.revenue, r.quota, att, r.deals_won, r.deals_lost, r.pipeline_value, `"${(r.notes||'').replace(/"/g,'""')}"`].join(',');
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-data.csv"');
  res.send([header, ...lines].join('\n'));
});

router.get('/recruitment/export', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT week_label,week_start,applications,interviews,offers,joiners,notes FROM recruitment_uploads ORDER BY week_start').all();
  const header = 'Week,Week Start,Applications,Interviews,Offers,Joiners,Notes';
  const lines = rows.map(r => [r.week_label, r.week_start, r.applications, r.interviews, r.offers, r.joiners, `"${(r.notes||'').replace(/"/g,'""')}"`].join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="recruitment-data.csv"');
  res.send([header, ...lines].join('\n'));
});

router.get('/users/export', auth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT u.email, u.role, u.is_active, p.full_name, p.job_title, p.department
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY p.full_name`).all();
  const header = 'Name,Email,Role,Department,Job Title,Active';
  const lines = rows.map(r => [r.full_name||'', r.email, r.role, r.department||'', r.job_title||'', r.is_active ? 'Yes':'No'].join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
  res.send([header, ...lines].join('\n'));
});

function auditAction(user, action, target, details='') {
  try {
    db.prepare('INSERT INTO audit_log (id,action,actor_id,actor_email,target,details) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), action, user.id, user.email, target, details);
  } catch {}
}

// ── User active/inactive toggle ──────────────────────────────────
router.patch('/users/:id/status', auth, adminOnly, (req, res) => {
  const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newStatus = user.is_active ? 0 : 1;
  db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, req.params.id);
  res.json({ id: req.params.id, is_active: newStatus });
});

module.exports = router;
