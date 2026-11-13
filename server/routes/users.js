const router = require('express').Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const baseSelect = `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
  p.full_name, p.avatar_url, p.job_title, p.department, p.bio,
  p.skills, p.certifications, p.projects, p.unavailability,
  p.well_being_status, p.passion, p.reports_to, p.updated_at
  FROM users u LEFT JOIN profiles p ON p.user_id = u.id`;

function parseProfile(row) {
  if (!row) return null;
  for (const f of ['skills', 'certifications', 'projects', 'unavailability']) {
    try { row[f] = JSON.parse(row[f] || '[]'); } catch { row[f] = []; }
  }
  return row;
}

router.get('/', auth, (req, res) => {
  const { q } = req.query;
  const activeFilter = req.user.role === 'admin' ? '' : 'AND u.is_active=1';
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(`${baseSelect} WHERE (p.full_name LIKE ? OR p.job_title LIKE ? OR p.department LIKE ? OR u.email LIKE ? OR p.skills LIKE ?) ${activeFilter} ORDER BY p.full_name`).all(like, like, like, like, like);
  } else {
    rows = db.prepare(`${baseSelect} WHERE 1=1 ${activeFilter} ORDER BY p.full_name`).all();
  }
  res.json(rows.map(parseProfile));
});

router.get('/me', auth, (req, res) => {
  const row = db.prepare(`${baseSelect} WHERE u.id = ?`).get(req.user.id);
  res.json(parseProfile(row));
});

router.get('/:id', auth, (req, res) => {
  const row = db.prepare(`${baseSelect} WHERE u.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json(parseProfile(row));
});

router.put('/:id', auth, (req, res) => {
  const targetId = req.params.id;
  if (req.user.id !== targetId && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { full_name, job_title, department, bio, skills, certifications, projects, unavailability, well_being_status, passion, avatar_url, reports_to, role } = req.body;
  db.prepare(`UPDATE profiles SET
    full_name = COALESCE(?, full_name), job_title = COALESCE(?, job_title), department = COALESCE(?, department),
    bio = COALESCE(?, bio), skills = COALESCE(?, skills), certifications = COALESCE(?, certifications),
    projects = COALESCE(?, projects), unavailability = COALESCE(?, unavailability),
    well_being_status = COALESCE(?, well_being_status), passion = COALESCE(?, passion),
    avatar_url = COALESCE(?, avatar_url), reports_to = CASE WHEN ? THEN ? ELSE reports_to END,
    updated_at = datetime('now')
    WHERE user_id = ?`).run(
    full_name ?? null, job_title ?? null, department ?? null, bio ?? null,
    skills !== undefined ? JSON.stringify(skills) : null,
    certifications !== undefined ? JSON.stringify(certifications) : null,
    projects !== undefined ? JSON.stringify(projects) : null,
    unavailability !== undefined ? JSON.stringify(unavailability) : null,
    well_being_status ?? null, passion ?? null, avatar_url ?? null,
    'reports_to' in req.body ? 1 : 0, reports_to || null,
    targetId
  );
  if (role && req.user.role === 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  }
  const row = db.prepare(`${baseSelect} WHERE u.id = ?`).get(targetId);
  res.json(parseProfile(row));
});

router.get('/:id/performance', auth, (req, res) => {
  const targetId = req.params.id === 'me' ? req.user.id : req.params.id;
  if (req.user.id !== targetId && !['admin','manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden' });

  const { period } = req.query;
  const target = period
    ? db.prepare('SELECT * FROM member_targets WHERE user_id=? AND period=?').get(targetId, period)
    : db.prepare('SELECT * FROM member_targets WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(targetId);

  const wonDeals = db.prepare("SELECT COUNT(*) as c, SUM(value) as rev FROM deals WHERE owner_id=? AND stage='won'").get(targetId);
  const lostDeals = db.prepare("SELECT COUNT(*) as c FROM deals WHERE owner_id=? AND stage='lost'").get(targetId);
  const pipelineDeals = db.prepare("SELECT COUNT(*) as c, SUM(value) as val FROM deals WHERE owner_id=? AND stage NOT IN ('won','lost')").get(targetId);
  const allDeals = db.prepare('SELECT * FROM deals WHERE owner_id=? ORDER BY created_at DESC').all(targetId);
  const history = db.prepare('SELECT * FROM member_targets WHERE user_id=? ORDER BY period DESC LIMIT 8').all(targetId);

  const revenue = wonDeals.rev || 0;
  const targetRev = target?.target_revenue || 0;
  const attainment = targetRev > 0 ? Math.round((revenue / targetRev) * 100) : null;

  res.json({
    target,
    revenue, attainment, target_revenue: targetRev,
    deals_won: wonDeals.c || 0,
    deals_lost: lostDeals.c || 0,
    pipeline_deals: pipelineDeals.c || 0,
    pipeline_value: pipelineDeals.val || 0,
    win_rate: (wonDeals.c + lostDeals.c) > 0 ? Math.round((wonDeals.c / (wonDeals.c + lostDeals.c)) * 100) : 0,
    deals: allDeals,
    history,
  });
});

module.exports = router;
