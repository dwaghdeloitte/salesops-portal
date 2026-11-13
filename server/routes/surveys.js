const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

function parseSurvey(s) {
  if (!s) return null;
  try { s.questions = JSON.parse(s.questions || '[]'); } catch { s.questions = []; }
  return s;
}

router.get('/', auth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let rows;
  if (isAdmin) {
    rows = db.prepare(`SELECT s.*, p.full_name AS creator_name,
      (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id) AS response_count,
      (SELECT submitted_at FROM survey_responses sr WHERE sr.survey_id = s.id AND sr.user_id = ? LIMIT 1) AS user_submitted_at
      FROM surveys s LEFT JOIN profiles p ON p.user_id = s.created_by ORDER BY s.created_at DESC`).all(req.user.id);
  } else {
    rows = db.prepare(`SELECT s.*, p.full_name AS creator_name,
      (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id) AS response_count,
      (SELECT submitted_at FROM survey_responses sr WHERE sr.survey_id = s.id AND sr.user_id = ? LIMIT 1) AS user_submitted_at
      FROM surveys s LEFT JOIN profiles p ON p.user_id = s.created_by
      WHERE s.due_date > datetime('now') ORDER BY s.created_at DESC`).all(req.user.id);
  }
  res.json(rows.map(parseSurvey));
});

router.get('/:id', auth, (req, res) => {
  const s = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && new Date(s.due_date) < new Date()) return res.status(403).json({ error: 'Survey has closed' });
  const resp = db.prepare('SELECT * FROM survey_responses WHERE survey_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (resp) { try { resp.answers = JSON.parse(resp.answers); } catch {} }
  res.json({ ...parseSurvey(s), my_response: resp || null });
});

router.post('/', auth, adminOnly, (req, res) => {
  const { title, description, questions, due_date } = req.body;
  if (!title || !questions || !due_date) return res.status(400).json({ error: 'title, questions, and due_date required' });
  const id = uuidv4();
  db.prepare('INSERT INTO surveys (id, title, description, questions, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, description || '', JSON.stringify(questions), due_date, req.user.id);
  res.status(201).json(parseSurvey(db.prepare('SELECT * FROM surveys WHERE id = ?').get(id)));
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { title, description, questions, due_date, status } = req.body;
  db.prepare('UPDATE surveys SET title=?, description=?, questions=?, due_date=?, status=? WHERE id=?').run(title, description, JSON.stringify(questions), due_date, status || 'active', req.params.id);
  res.json(parseSurvey(db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/respond', auth, (req, res) => {
  const { answers } = req.body;
  if (!answers) return res.status(400).json({ error: 'answers required' });
  const s = db.prepare('SELECT due_date FROM surveys WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Survey not found' });
  if (new Date(s.due_date) < new Date()) return res.status(403).json({ error: 'Survey has closed' });
  const existing = db.prepare('SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) {
    db.prepare('UPDATE survey_responses SET answers = ?, submitted_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(answers), existing.id);
    res.json({ id: existing.id, survey_id: req.params.id, user_id: req.user.id, answers });
  } else {
    const id = uuidv4();
    db.prepare('INSERT INTO survey_responses (id, survey_id, user_id, answers) VALUES (?, ?, ?, ?)').run(id, req.params.id, req.user.id, JSON.stringify(answers));
    res.json({ id, survey_id: req.params.id, user_id: req.user.id, answers });
  }
});

router.get('/:id/results', auth, adminOnly, (req, res) => {
  const survey = parseSurvey(db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id));
  if (!survey) return res.status(404).json({ error: 'Not found' });
  const responses = db.prepare(`SELECT sr.*, p.full_name FROM survey_responses sr LEFT JOIN profiles p ON p.user_id = sr.user_id WHERE sr.survey_id = ? ORDER BY sr.submitted_at DESC`).all(req.params.id);
  responses.forEach(r => { try { r.answers = JSON.parse(r.answers); } catch { r.answers = {}; } });
  const report = db.prepare('SELECT * FROM survey_reports WHERE survey_id = ?').get(req.params.id) || null;
  res.json({ survey, responses, report });
});

router.post('/:id/report', auth, adminOnly, (req, res) => {
  const { summary, published_to_members } = req.body;
  const existing = db.prepare('SELECT id FROM survey_reports WHERE survey_id = ?').get(req.params.id);
  const pub = published_to_members ? 1 : 0;
  if (existing) {
    db.prepare('UPDATE survey_reports SET summary = ?, published_to_members = ?, updated_at = datetime(\'now\') WHERE survey_id = ?').run(summary || '', pub, req.params.id);
  } else {
    db.prepare('INSERT INTO survey_reports (id, survey_id, summary, published_to_members, created_by) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.params.id, summary || '', pub, req.user.id);
  }
  res.json(db.prepare('SELECT * FROM survey_reports WHERE survey_id = ?').get(req.params.id));
});

router.get('/:id/report/public', auth, (req, res) => {
  const row = db.prepare(`SELECT sr.*, s.title, s.questions FROM survey_reports sr JOIN surveys s ON s.id = sr.survey_id WHERE sr.survey_id = ? AND sr.published_to_members = 1`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Report not available' });
  try { row.questions = JSON.parse(row.questions); } catch {}
  res.json(row);
});

module.exports = router;
