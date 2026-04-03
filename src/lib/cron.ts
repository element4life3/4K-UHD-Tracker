import cron from 'node-cron';

let cronInitialized = false;

export function initCron(baseUrl: string) {
  if (cronInitialized) return;
  cronInitialized = true;

  // Run daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[CRON] Starting daily 4K Blu-ray release update...');
    try {
      const res = await fetch(`${baseUrl}/api/refresh`, { method: 'POST' });
      const data = await res.json();
      console.log(`[CRON] Updated ${data.count} releases at ${data.lastUpdated}`);
    } catch (err) {
      console.error('[CRON] Failed to update releases:', err);
    }
  });

  console.log('[CRON] Daily update scheduled for 6:00 AM');
}
