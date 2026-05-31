import { log } from '../utils/logger';

interface RunMetrics {
  durationMs: number;
  rawCount: number;
  dueCount: number;
}

export async function sendTelegramSummary(metrics: RunMetrics): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    log.warn('Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return;
  }

  const minutes = Math.floor(metrics.durationMs / 60000);
  const seconds = Math.floor((metrics.durationMs % 60000) / 1000);

  const message = `*Run Completion Summary*
*Total Due Students:* ${metrics.dueCount}
*Total Raw Records:* ${metrics.rawCount}
*Duration:* ${minutes}m ${seconds}s
*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}

_Check the dashboard for details._`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: 'Markdown',
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.warn(`Telegram notification failed: ${response.status} ${errorText}`);
    } else {
      log.info('Telegram notification sent successfully');
    }
  } catch (err) {
    log.warn(`Telegram notification failed: ${(err as Error).message}`);
  }
}
