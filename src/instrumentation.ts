/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Used to clean up any orders left in 'generating' state by a previous
 * process being killed (e.g. during a Railway deploy mid-generation).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { resetStuckGeneratingOrders } = await import('./lib/db');
    const count = resetStuckGeneratingOrders();
    if (count > 0) {
      console.log(`[startup] Reset ${count} stuck 'generating' order(s) to 'failed'`);
    }
  }
}
