export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCron } = await import('./lib/cron');
    const port = process.env.PORT || 3000;
    initCron(`http://localhost:${port}`);
  }
}
