const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware/auth');

const STAGE_PROB = { prospect: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };

function auditLog(action, actor, target, details = '') {
  try {
    db.prepare('INSERT INTO audit_log (id,action,actor_id,actor_email,target,details) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), action, actor.id, actor.email, target, details);
  } catch {}
}

router.get('/', auth, (req, res) => {
  const { stage, owner } = req.query;
  let q = `SELECT d.*, u.id as owner_user_id,
    p.full_name as owner_name, p.avatar_url as owner_avatar
    FROM deals d LEFT JOIN users u ON u.id = d.owner_id LEFT JOIN profiles p ON p.user_id = d.owner_id`;
  const wheres = [], params = [];
  if (stage) { wheres.push('d.stage = ?'); params.push(stage); }
  if (owner) { wheres.push('d.owner_id = ?'); params.push(owner); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  q += ' ORDER BY d.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', auth, (req, res) => {
  const { title, client_name, stage = 'prospect', value = 0, owner_id, expected_close, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const id = uuidv4();
  const prob = STAGE_PROB[stage] ?? 10;
  db.prepare(`INSERT INTO deals (id,title,client_name,stage,value,probability,owner_id,expected_close,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, title, client_name||'', stage, value, prob, owner_id||req.user.id, expected_close||null, notes||'', req.user.id);
  auditLog('deal.create', req.user, title);
  notifyOwner(owner_id||req.user.id, req.user, title, id);
  res.json(db.prepare('SELECT * FROM deals WHERE id=?').get(id));
});

router.put('/:id', auth, (req, res) => {
  const { title, client_name, stage, value, owner_id, expected_close, notes } = req.body;
  const existing = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.owner_id !== req.user.id && !['admin','manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden: you do not own this deal' });
  const prob = stage ? (STAGE_PROB[stage] ?? existing.probability) : existing.probability;
  db.prepare(`UPDATE deals SET
    title=COALESCE(?,title), client_name=COALESCE(?,client_name),
    stage=COALESCE(?,stage), value=COALESCE(?,value), probability=?,
    owner_id=COALESCE(?,owner_id), expected_close=COALESCE(?,expected_close),
    notes=COALESCE(?,notes), updated_at=datetime('now') WHERE id=?`)
    .run(title??null, client_name??null, stage??null, value??null, prob,
         owner_id??null, expected_close??null, notes??null, req.params.id);
  if (stage && stage !== existing.stage) auditLog('deal.stage', req.user, existing.title, `${existing.stage} → ${stage}`);
  res.json(db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  const d = db.prepare('SELECT title, owner_id FROM deals WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  if (d.owner_id !== req.user.id && !['admin','manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden: you do not own this deal' });
  db.prepare('DELETE FROM deals WHERE id=?').run(req.params.id);
  auditLog('deal.delete', req.user, d.title);
  res.json({ success: true });
});

router.get('/export', auth, (req, res) => {
  const rows = db.prepare(`SELECT d.title, d.client_name, d.stage, d.value, d.probability,
    d.expected_close, d.notes, p.full_name as owner, d.created_at
    FROM deals d LEFT JOIN profiles p ON p.user_id = d.owner_id
    WHERE d.owner_id = ? ORDER BY d.created_at DESC`).all(req.user.id);
  const header = 'Title,Client,Stage,Value,Probability,Expected Close,Owner,Created\n';
  const csv = rows.map(r =>
    [r.title, r.client_name, r.stage, r.value, r.probability, r.expected_close||'', r.owner||'', r.created_at]
      .map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="my-deals.csv"');
  res.send(header + csv);
});

function notifyOwner(ownerId, actor, dealTitle, dealId) {
  if (ownerId === actor.id) return;
  try {
    db.prepare('INSERT INTO notifications (id,user_id,type,title,body,related_id) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), ownerId, 'deal', 'New deal assigned to you', `"${dealTitle}" was assigned to you by ${actor.email}`, dealId);
  } catch {}
}

module.exports = router;
