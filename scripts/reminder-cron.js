/* eslint-disable no-console */
// Simple local cron runner for dev.
// Calls the process-reminders endpoint every minute.

const DEFAULT_URL = process.env.CRON_URL || 'http://localhost:3000/api/process-reminders';
const INTERVAL_MS = Number(process.env.CRON_INTERVAL_MS || 60000);

async function tick() {
  const url = DEFAULT_URL;
  try {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    const now = new Date().toISOString();
    console.log(`[${now}] ${res.status} ${res.statusText}: ${text}`);
  } catch (e) {
    const now = new Date().toISOString();
    console.error(`[${now}] ERROR:`, e?.message || String(e));
  }
}

console.log(`Starting local reminder cron. URL=${DEFAULT_URL} every ${INTERVAL_MS}ms`);
tick();
const timer = setInterval(tick, INTERVAL_MS);

process.on('SIGINT', () => {
  console.log('Stopping local reminder cron...');
  clearInterval(timer);
  process.exit(0);
});


