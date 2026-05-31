import { Router } from 'express';
import { getDb, queryStudentDues } from '../../utils/historyDb';

export const duesRouter = Router();

// Dues trends over time (aggregated per run)
duesRouter.get('/trends', (_req, res) => {
  try {
    const db = getDb();
    const trends = db.prepare(`
      SELECT r.id as runId, r.timestamp, SUM(d.total_due) as totalDue, COUNT(DISTINCT d.student_id) as studentCount
      FROM dues_history d
      JOIN runs r ON d.run_id = r.id
      GROUP BY r.id
      ORDER BY r.timestamp DESC
      LIMIT 30
    `).all();
    res.json(trends);
  } catch {
    res.json([]);
  }
});

// Single student dues history
duesRouter.get('/student/:id', (req, res) => {
  const history = queryStudentDues(req.params.id);
  res.json(history);
});
