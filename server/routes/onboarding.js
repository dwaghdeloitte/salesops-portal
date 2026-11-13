const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const DEFAULT_ITEMS = [
  'Complete paperwork & contracts',
  'Set up laptop & system access',
  'Meet buddy / mentor',
  'Complete compliance training',
  'Attend team orientation',
  'First 1:1 with manager',
  'Join all relevant Slack channels',
  'Review sales playbook & pitch decks',
  'Shadow first client call',
  '30-day performance check-in',
];

router.get('/:userId', auth, (req, res) => {
  const targetId = req.params.userId;
  if (req.user.id !== targetId && !['admin','manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden' });
  const items = db.prepare('SELECT * FROM onboarding_items WHERE user_id=? ORDER BY created_at').all(targetId);
  res.json(items);
});

router.post('/:userId/init', auth, adminOnly, (req, res) => {
  const targetId = req.params.userId;
  const existing = db.prepare('SELECT COUNT(*) as c FROM onboarding_items WHERE user_id=?').get(targetId).c;
  if (existing > 0) return res.status(409).json({ error: 'Onboarding already initialised for this user' });
  const items = DEFAULT_ITEMS.map(item => ({ id: uuidv4(), user_id: targetId, item }));
  const stmt = db.prepare('INSERT INTO onboarding_items (id,user_id,item) VALUES (?,?,?)');
  for (const it of items) stmt.run(it.id, it.user_id, it.item);
  res.json(db.prepare('SELECT * FROM onboarding_items WHERE user_id=? ORDER BY created_at').all(targetId));
});

router.patch('/:userId/:itemId', auth, (req, res) => {
  const { completed } = req.body;
  db.prepare('UPDATE onboarding_items SET completed=? WHERE id=? AND user_id=?')
    .run(completed ? 1 : 0, req.params.itemId, req.params.userId);
  res.json(db.prepare('SELECT * FROM onboarding_items WHERE id=?').get(req.params.itemId));
});

router.post('/:userId', auth, adminOnly, (req, res) => {
  const { item, due_date } = req.body;
  if (!item) return res.status(400).json({ error: 'item text is required' });
  const id = uuidv4();
  db.prepare('INSERT INTO onboarding_items (id,user_id,item,due_date) VALUES (?,?,?,?)')
    .run(id, req.params.userId, item, due_date||null);
  res.json(db.prepare('SELECT * FROM onboarding_items WHERE id=?').get(id));
});

router.delete('/:userId/:itemId', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM onboarding_items WHERE id=? AND user_id=?').run(req.params.itemId, req.params.userId);
  res.json({ success: true });
});

module.exports = router;
