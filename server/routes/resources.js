const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(`SELECT r.*, p.full_name as uploader_name FROM resources r
      LEFT JOIN profiles p ON p.user_id = r.created_by
      WHERE r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ?
      ORDER BY r.created_at DESC`).all(like, like, like);
  } else {
    rows = db.prepare(`SELECT r.*, p.full_name as uploader_name FROM resources r
      LEFT JOIN profiles p ON p.user_id = r.created_by ORDER BY r.created_at DESC`).all();
  }
  rows.forEach(r => { try { r.tags = JSON.parse(r.tags || '[]'); } catch { r.tags = []; } });
  res.json(rows);
});

router.get('/:id/download', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM resources WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const buf = Buffer.from(row.file_content, 'base64');
  res.setHeader('Content-Disposition', `attachment; filename="${row.file_name}"`);
  res.setHeader('Content-Type', row.file_type || 'application/octet-stream');
  res.send(buf);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { title, description, file_name, file_content, file_type, tags } = req.body;
  if (!title || !file_content) return res.status(400).json({ error: 'title and file_content are required' });
  if (file_content.length > 700000) return res.status(400).json({ error: 'File too large (max 500 KB)' });
  const id = uuidv4();
  db.prepare('INSERT INTO resources (id,title,description,file_name,file_content,file_type,tags,created_by) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, title, description||'', file_name||'', file_content, file_type||'', JSON.stringify(tags||[]), req.user.id);
  res.json(db.prepare('SELECT id,title,description,file_name,file_type,tags,created_by,created_at FROM resources WHERE id=?').get(id));
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM resources WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
