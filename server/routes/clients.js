const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { q, sector } = req.query;
  let sql = `SELECT c.*, p.full_name as owner_name
    FROM clients c LEFT JOIN profiles p ON p.user_id = c.relationship_owner_id WHERE 1=1`;
  const params = [];
  if (q) { sql += ' AND (c.name LIKE ? OR c.notes LIKE ? OR c.sector LIKE ?)'; const like = `%${q}%`; params.push(like, like, like); }
  if (sector) { sql += ' AND c.sector = ?'; params.push(sector); }
  sql += ' ORDER BY c.name';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', auth, (req, res) => {
  const { name, sector, relationship_owner_id, website, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = uuidv4();
  db.prepare('INSERT INTO clients (id,name,sector,relationship_owner_id,website,notes,created_by) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, sector||'', relationship_owner_id||null, website||'', notes||'', req.user.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id=?').get(id));
});

router.put('/:id', auth, (req, res) => {
  const { name, sector, relationship_owner_id, website, notes } = req.body;
  const existing = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.relationship_owner_id !== req.user.id && existing.created_by !== req.user.id && !['admin','manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden: you do not manage this client' });
  db.prepare(`UPDATE clients SET name=COALESCE(?,name), sector=COALESCE(?,sector),
    relationship_owner_id=COALESCE(?,relationship_owner_id),
    website=COALESCE(?,website), notes=COALESCE(?,notes) WHERE id=?`)
    .run(name??null, sector??null, relationship_owner_id??null, website??null, notes??null, req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.relationship_owner_id !== req.user.id && existing.created_by !== req.user.id && !['admin','manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden: you do not manage this client' });
  db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
