/**
 * First-Run Setup Wizard — interactively prompts for credentials when .env is missing.
 *
 * Detects missing .env, prompts user for portal URL, username, and password,
 * validates the URL is reachable, and writes the .env file automatically.
 *
 * Triggered by: --setup flag, or when .env doesn't exist.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { log } from './logger';

const ENV_PATH = path.join(__dirname, '../../.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '../../.env.example');

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Checks if .env exists.
 */
export function envExists(): boolean {
  return fs.existsSync(ENV_PATH);
}

/**
 * Runs the interactive setup wizard.
 * Returns true if .env was created successfully.
 */
export async function runSetupWizard(): Promise<boolean> {
  log.info('');
  log.info('='.repeat(60));
  log.info('First-Run Setup Wizard');
  log.info('='.repeat(60));
  log.info('No .env file found. Let\'s set up your configuration.');
  log.info('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const portalUrl = await askQuestion(rl, 'Portal URL [https://duhais.eduexpert24.com]: ');
    const username = await askQuestion(rl, 'Portal Username: ');
    const password = await askQuestion(rl, 'Portal Password: ');

    if (!username || !password) {
      log.error('Username and password are required.');
      return false;
    }

    // Validate URL reachability
    const finalUrl = portalUrl || 'https://duhais.eduexpert24.com';
    log.info(`Validating URL: ${finalUrl}...`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(finalUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        log.info(`URL reachable (status ${resp.status})`);
      } else {
        log.warn(`URL returned status ${resp.status} — continuing anyway`);
      }
    } catch {
      log.warn('URL not reachable — check network connectivity. Continuing setup...');
    }

    // Read .env.example as template
    let envContent = '';
    if (fs.existsSync(ENV_EXAMPLE_PATH)) {
      envContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    }

    // Replace or append credentials
    const lines = envContent.split('\n');
    const credentialLines = [
      `PORTAL_BASE_URL="${finalUrl}"`,
      `PORTAL_USERNAME="${username}"`,
      `PORTAL_PASSWORD="${password}"`,
    ];

    // Find and replace existing credential lines, or append
    let foundBaseUrl = false;
    let foundUsername = false;
    let foundPassword = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('PORTAL_BASE_URL=')) {
        lines[i] = credentialLines[0];
        foundBaseUrl = true;
      } else if (lines[i].startsWith('PORTAL_USERNAME=')) {
        lines[i] = credentialLines[1];
        foundUsername = true;
      } else if (lines[i].startsWith('PORTAL_PASSWORD=')) {
        lines[i] = credentialLines[2];
        foundPassword = true;
      }
    }

    if (!foundBaseUrl) lines.push(credentialLines[0]);
    if (!foundUsername) lines.push(credentialLines[1]);
    if (!foundPassword) lines.push(credentialLines[2]);

    const finalContent = lines.join('\n');
    fs.writeFileSync(ENV_PATH, finalContent, { mode: 0o600 });

    log.info('');
    log.info('.env file created successfully!');
    log.info('You can now run: npm start');
    return true;
  } catch (err) {
    log.error(`Setup wizard failed: ${(err as Error).message}`);
    return false;
  } finally {
    rl.close();
  }
}
