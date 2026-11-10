import cron from 'node-cron';

// Auto-Close: sets started Travel Plans to CLOSED. Time and storage are injected (ports).
export async function closeStartedPlans({ plans, clock }) {
  return plans.closeStartedBy(clock.now());
}

// Runs hourly.
export function scheduleClosePlans(deps) {
  cron.schedule('0 * * * *', async () => {
    const closed = await closeStartedPlans(deps);
    if (closed) console.log(`[jobs] closed ${closed} plan(s)`);
  });
}
