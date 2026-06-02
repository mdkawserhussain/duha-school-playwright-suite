import { Router } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const configRouter = Router();

const ENV_PATH = path.join(__dirname, '../../../.env');

configRouter.get('/', (_req, res) => {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      return res.json({});
    }
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx);
        const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
        vars[key] = val;
      }
    }
    // Mask passwords
    if (vars.PORTAL_PASSWORD) vars.PORTAL_PASSWORD = '••••••••';
    res.json(vars);
  } catch {
    res.json({});
  }
});

// GET /api/config/test — test portal connectivity
configRouter.get('/test', async (_req, res) => {
  try {
    const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx);
        const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
        vars[key] = val;
      }
    }

    const url = vars.PORTAL_BASE_URL;
    if (!url) {
      res.json({ ok: false, message: 'PORTAL_BASE_URL is not set' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (response.ok) {
        res.json({ ok: true, message: `Portal reachable (${response.status})` });
      } else {
        res.json({ ok: false, message: `Portal returned ${response.status} ${response.statusText}` });
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        res.json({ ok: false, message: 'Connection timed out (10s)' });
      } else {
        res.json({ ok: false, message: `Cannot reach portal: ${err.message}` });
      }
    }
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

configRouter.put('/', (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    for (const [key, val] of Object.entries(updates)) {
      if (key === 'PORTAL_PASSWORD' && val === '••••••••') continue; // Don't overwrite masked value
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}="${val}"`;
      if (regex.test(content)) {
        content = content.replace(regex, line);
      } else {
        content += `\n${line}`;
      }
    }

    fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
