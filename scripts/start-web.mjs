#!/usr/bin/env node
/**
 * Dynamic port finder + spawner for the web UI.
 * Finds free ports for Express and Vite, then starts both.
 *
 * Usage: node scripts/start-web.js
 */

import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // Port taken, try next one
      findFreePort(startPort + 1).then(resolve, reject);
    });
  });
}

async function main() {
  const serverPort = await findFreePort(3001);
  const vitePort = await findFreePort(5173);

  console.log(`\n  🔌 Server: http://localhost:${serverPort}`);
  console.log(`  🌐 UI:     http://localhost:${vitePort}\n`);

  // Start Express server
  const server = spawn('npx', ['tsx', 'src/server/index.ts'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(serverPort) },
  });

  // Start Vite dev server
  const vite = spawn('npx', ['vite', '--config', 'web/vite.config.ts', '--port', String(vitePort)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, VITE_PROXY_PORT: String(serverPort) },
  });

  const shutdown = () => {
    server.kill('SIGTERM');
    vite.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.on('exit', () => { vite.kill('SIGTERM'); process.exit(0); });
  vite.on('exit', () => { server.kill('SIGTERM'); process.exit(0); });
}

main();
