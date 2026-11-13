const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

function enrichEvents(rows) {
  return rows.map(e => {
    const participants = db.prepare(`
      SELECT ep.user_id, p.full_name AS name FROM event_participants ep
      LEFT JOIN profiles p ON p.user_id = ep.user_id WHERE ep.event_id = ?
    `).all(e.id);
    return { ...e, participants };
  });
}

router.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, p.full_name AS creator_name FROM events e
    LEFT JOIN profiles p ON p.user_id = e.created_by ORDER BY e.event_date ASC
  `).all();
  res.json(enrichEvents(rows));
});

router.post('/', auth, (req, res) => {
  const { title, description, event_date, end_date, location } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'title and event_date required' });
  const id = uuidv4();
  db.prepare('INSERT INTO events (id, title, description, event_date, end_date, location, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, title, description || '', event_date, end_date || null, location || '', req.user.id);
  const row = db.prepare('SELECT e.*, p.full_name AS creator_name FROM events e LEFT JOIN profiles p ON p.user_id = e.created_by WHERE e.id = ?').get(id);
  res.status(201).json({ ...row, participants: [] });
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { title, description, event_date, end_date, location } = req.body;
  db.prepare('UPDATE events SET title=?, description=?, event_date=?, end_date=?, location=? WHERE id=?').run(title, description, event_date, end_date || null, location, req.params.id);
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json({ ...row, participants: enrichEvents([row])[0].participants });
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/join', auth, (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/join', auth, (req, res) => {
  db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
