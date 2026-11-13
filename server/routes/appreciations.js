const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const rows = db.prepare(`
    SELECT a.id, a.message, a.tags, a.created_at,
      pf.full_name AS from_name, pf.avatar_url AS from_avatar, a.from_user_id,
      pt.full_name AS to_name, pt.avatar_url AS to_avatar, a.to_user_id
    FROM appreciations a
    LEFT JOIN profiles pf ON pf.user_id = a.from_user_id
    LEFT JOIN profiles pt ON pt.user_id = a.to_user_id
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(parseInt(limit), offset);

  const enriched = rows.map(r => {
    const reactions = db.prepare(`SELECT emoji, COUNT(*) as count,
      MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END) as reacted
      FROM reactions WHERE appreciation_id=? GROUP BY emoji`)
      .all(req.user.id, r.id);
    return { ...r, tags: JSON.parse(r.tags || '[]'), reactions };
  });

  const total = db.prepare('SELECT COUNT(*) as c FROM appreciations').get().c;
  res.json({ data: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.post('/', auth, (req, res) => {
  const { to_user_id, message, tags } = req.body;
  if (!to_user_id || !message) return res.status(400).json({ error: 'to_user_id and message required' });
  const id = uuidv4();
  db.prepare('INSERT INTO appreciations (id, from_user_id, to_user_id, message, tags) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, to_user_id, message, JSON.stringify(tags || []));
  res.status(201).json({ id, from_user_id: req.user.id, to_user_id, message, tags: tags || [] });
});

router.delete('/:id', auth, (req, res) => {
  const row = db.prepare('SELECT from_user_id FROM appreciations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.from_user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM appreciations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/react', auth, (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'emoji required' });
  const exists = db.prepare('SELECT id FROM reactions WHERE appreciation_id=? AND user_id=? AND emoji=?').get(req.params.id, req.user.id, emoji);
  if (exists) {
    db.prepare('DELETE FROM reactions WHERE id=?').run(exists.id);
    return res.json({ action: 'removed' });
  }
  db.prepare('INSERT INTO reactions (id,appreciation_id,user_id,emoji) VALUES (?,?,?,?)').run(uuidv4(), req.params.id, req.user.id, emoji);
  res.json({ action: 'added' });
});

module.exports = router;
