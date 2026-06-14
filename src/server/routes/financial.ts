import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { extractFinancialData } from '../../extractors/financialExtractor';
import type { FinancialReportParams } from '../../types/FinancialReport';

export const financialRouter = Router();

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

// GET /api/financial/status - Check extractor status
financialRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const rawFile = path.join(OUTPUT_DIR, 'financial_raw.json');
    const summaryFile = path.join(OUTPUT_DIR, 'financial_cash_flow.json');
    const feeCollectionFile = path.join(OUTPUT_DIR, 'financial_fee_collection.json');

    const hasRaw = fs.existsSync(rawFile);
    const hasSummary = fs.existsSync(summaryFile);
    const hasFeeCollection = fs.existsSync(feeCollectionFile);

    let latestData = null;
    if (hasRaw) {
      try {
        latestData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
      } catch {
        latestData = null;
      }
    }

    res.json({
      status: hasRaw ? 'ready' : 'no_data',
      hasRaw,
      hasSummary,
      hasFeeCollection,
      ledgerCount: latestData ? latestData.length : 0,
      lastUpdated: hasRaw ? fs.statSync(rawFile).mtime.toISOString() : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financial/generate - Generate financial report
financialRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, status = 'approved' } = req.body;

    if (!from_date || !to_date) {
      return res.status(400).json({ error: 'from_date and to_date are required' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from_date) || !dateRegex.test(to_date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const params: FinancialReportParams = { from_date, to_date, status };

    // Get Playwright page from session (you'll need to implement this based on your auth setup)
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Financial report generation initiated',
      params
    });
  } catch (err: any) {
    console.error('[financial] Generate failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financial/summary - Get latest summary data
financialRouter.get('/summary', (_req: Request, res: Response) => {
  try {
    const summaryFile = path.join(OUTPUT_DIR, 'financial_cash_flow.json');
    const feeCollectionFile = path.join(OUTPUT_DIR, 'financial_fee_collection.json');

    if (!fs.existsSync(summaryFile)) {
      return res.json({
        status: 'no_data',
        message: 'No financial data available. Run "Generate" first.'
      });
    }

    const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
    const feeCollection = fs.existsSync(feeCollectionFile)
      ? JSON.parse(fs.readFileSync(feeCollectionFile, 'utf-8'))
      : [];

    res.json({
      status: 'ready',
      summary,
      feeCollection
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financial/download/:format - Download Excel/PDF
financialRouter.get('/download/:format', (req: Request, res: Response) => {
  try {
    const format = req.params.format as string;

    if (!['json', 'excel', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use json, excel, or pdf' });
    }

    const filePath = path.join(OUTPUT_DIR, `financial_raw.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No financial data available' });
    }

    if (format === 'json') {
      res.download(filePath, 'financial_report.json');
    } else {
      // Excel and PDF generation will be implemented in Task 5
      res.status(501).json({ error: `${format} export not yet implemented` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});