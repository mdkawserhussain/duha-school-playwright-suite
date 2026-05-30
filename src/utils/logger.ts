import { CONFIG } from '../config';

/**
 * Global Logger utility with integrated credential redaction layers
 * to prevent leaking credentials in output logs, error stacks, or CI reports.
 */
function redact(message: string): string {
  let clean = message;
  // Safely check CONFIG presence as the logger is imported during CONFIG initialization
  if (CONFIG?.credentials?.username) {
    clean = clean.replaceAll(CONFIG.credentials.username, '[REDACTED_USERNAME]');
  }
  if (CONFIG?.credentials?.password) {
    clean = clean.replaceAll(CONFIG.credentials.password, '[REDACTED_PASSWORD]');
  }
  return clean;
}

export const log = {
  info(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[32m[${timestamp}] [INFO] ${redact(message)}\x1b[0m`);
  },

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`\x1b[31m[${timestamp}] [ERROR] ${redact(message)}\x1b[0m`);
    if (error) {
      const errMessage = error instanceof Error ? error.stack || error.message : String(error);
      console.error(`\x1b[31m${redact(errMessage)}\x1b[0m`);
    }
  },

  step(stepName: string): void {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[34m[${timestamp}] [STEP] >>> ${stepName.toUpperCase()} <<<\x1b[0m`);
  },

  warn(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[33m[${timestamp}] [WARN] ${redact(message)}\x1b[0m`);
  },
};
