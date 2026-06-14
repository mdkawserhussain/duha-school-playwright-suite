const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const net = require('net');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('input')) fs.mkdirSync('input');
    cb(null, 'input');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Active log stream clients
let logClients = [];

function sseLog(message) {
  const data = JSON.stringify({ message });
  logClients.forEach(client => client.write(`data: ${data}\n\n`));
}

// Overrides to capture console output and prevent process.exit from killing the server
const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

async function runCaptured(name, fn) {
  sseLog(`\n--- STARTING ${name.toUpperCase()} ---`);
  
  // Override console
  console.log = (...msg) => {
    const txt = msg.join(' ');
    originalLog.apply(console, msg);
    sseLog(txt);
  };
  console.error = (...msg) => {
    const txt = msg.join(' ');
    originalError.apply(console, msg);
    sseLog(`❌ ERROR: ${txt}`);
  };
  
  // Override process.exit
  process.exit = (code) => {
    sseLog(`[Script invoked exit with code: ${code}]`);
    throw new Error(`Script exited with code ${code}`);
  };

  try {
    await fn();
    sseLog(`\n✅ ${name.toUpperCase()} COMPLETED SUCCESSFULLY.`);
  } catch (err) {
    sseLog(`\n❌ ${name.toUpperCase()} FAILED: ${err.message}`);
    originalError(err);
  } finally {
    // Restore overrides
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  }
}

// ─── LOG STREAM ENDPOINT (SSE) ──────────────────────────────────────────────
app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logClients.push(res);
  sseLog('Log stream connected.');

  req.on('close', () => {
    logClients = logClients.filter(client => client !== res);
  });
});

// ─── DATA ENDPOINTS ─────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config.json' });
  }
});

app.put('/api/config', (req, res) => {
  try {
    fs.writeFileSync('config.json', JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config.json' });
  }
});

app.get('/api/parsed', (req, res) => {
  try {
    if (!fs.existsSync('temp/parsed.json')) return res.json([]);
    const data = JSON.parse(fs.readFileSync('temp/parsed.json', 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read temp/parsed.json' });
  }
});

app.put('/api/parsed', async (req, res) => {
  try {
    if (!fs.existsSync('temp')) fs.mkdirSync('temp');
    const data = req.body;
    fs.writeFileSync('temp/parsed.json', JSON.stringify(data, null, 2));

    // Regenerate temp/parsed.docx as requested
    const parseMod = require('./parse');
    if (parseMod.saveToDocx) {
      await parseMod.saveToDocx(data, 'temp/parsed.docx');
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to save parsed data: ${err.message}` });
  }
});

app.get('/api/payroll', (req, res) => {
  try {
    if (!fs.existsSync('temp/final_payroll.json')) return res.json([]);
    const data = JSON.parse(fs.readFileSync('temp/final_payroll.json', 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read final payroll' });
  }
});

app.get('/api/audit', (req, res) => {
  try {
    if (!fs.existsSync('output/audit-report.txt')) return res.send('No audit report found. Run verification.');
    const data = fs.readFileSync('output/audit-report.txt', 'utf8');
    res.send(data);
  } catch (err) {
    res.status(500).send('Error reading audit report.');
  }
});

// ─── PIPELINE RUNNERS ───────────────────────────────────────────────────────
app.post('/api/run/parse', async (req, res) => {
  res.json({ success: true, message: 'Parse started' });
  await runCaptured('parse', async () => {
    delete require.cache[require.resolve('./parse')];
    const parse = require('./parse');
    await parse.main();
  });
});

app.post('/api/run/all', async (req, res) => {
  res.json({ success: true, message: 'Report generation started' });
  await runCaptured('generate reports', async () => {
    delete require.cache[require.resolve('./all')];
    const all = require('./all');
    await all.main();
  });
});

app.post('/api/run/verify', async (req, res) => {
  const isFinal = req.query.final === 'true';
  res.json({ success: true, message: 'Verification started' });
  await runCaptured(`verify (${isFinal ? 'final' : 'intermediate'})`, async () => {
    delete require.cache[require.resolve('./verify')];
    const verify = require('./verify');
    await verify.verify(isFinal);
  });
});

app.post('/api/run/bank2', async (req, res) => {
  res.json({ success: true, message: 'Bank2 started' });
  await runCaptured('bank2 letter', async () => {
    delete require.cache[require.resolve('./bank2')];
    const bank2 = require('./bank2');
    await bank2.main();
  });
});

app.post('/api/run/whatsapp', async (req, res) => {
  res.json({ success: true, message: 'WhatsApp links generation started' });
  await runCaptured('whatsapp links', async () => {
    delete require.cache[require.resolve('./wa')];
    const wa = require('./wa');
    await wa.main();
  });
});

// ─── FILE UPLOADS ───────────────────────────────────────────────────────────
app.post('/api/upload/att', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ success: true, filename: req.file.originalname });
});

app.post('/api/upload/monthly2', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ success: true, filename: req.file.originalname });
});

// ─── OUTPUT FILE LIST & DOWNLOAD ───────────────────────────────────────────
app.get('/api/outputs', (req, res) => {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) return res.json([]);
  try {
    const files = fs.readdirSync(outputDir).map(file => {
      const stats = fs.statSync(path.join(outputDir, file));
      return {
        name: file,
        size: stats.size,
        mtime: stats.mtime
      };
    });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list output files' });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'output', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.download(filePath);
});

// ─── DYNAMIC PORT ALLOCATION ────────────────────────────────────────────────
const DEFAULT_PORT = 3000;

function findAvailablePort(startPort, callback) {
  const server = net.createServer();
  server.listen(startPort, () => {
    server.once('close', () => callback(startPort));
    server.close();
  });
  server.on('error', () => {
    findAvailablePort(startPort + 1, callback);
  });
}

findAvailablePort(DEFAULT_PORT, (port) => {
  app.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 DUHA Payroll Web UI Dashboard is running!`);
    console.log(`👉 http://localhost:${port}`);
    console.log(`==================================================\n`);
  });
});
