import { Router } from 'express';
import { getDb } from '../../utils/historyDb';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req, res) => {
  try {
    const db = getDb();

    const latestRun = db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get();
    const totalRuns = db.prepare('SELECT COUNT(*) as count FROM runs').get();
    const totalDues = db.prepare('SELECT SUM(total_due) as total FROM dues_history WHERE run_id = (SELECT id FROM runs ORDER BY id DESC LIMIT 1)').get();

    const byClass = db.prepare(`
      SELECT class_name as className, SUM(total_due) as totalDue, COUNT(*) as studentCount
      FROM dues_history
      WHERE run_id = (SELECT id FROM runs ORDER BY id DESC LIMIT 1)
      GROUP BY class_name
      ORDER BY totalDue DESC
    `).all();

    const recentRuns = db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 10').all();

    res.json({
      latestRun,
      totalRuns: (totalRuns as any).count,
      totalDues: (totalDues as any).total || 0,
      byClass,
      recentRuns,
    });
  } catch (err) {
    res.json({ latestRun: null, totalRuns: 0, totalDues: 0, byClass: [], recentRuns: [] });
  }
});
