import { Router } from 'express';
import { getDb } from '../../utils/historyDb';

export const runsRouter = Router();

runsRouter.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const db = getDb();
    const runs = db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM runs').get();
    res.json({ runs, total: (total as any).count });
  } catch {
    res.json({ runs: [], total: 0 });
  }
});

runsRouter.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});
