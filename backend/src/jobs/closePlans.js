import cron from 'node-cron';
import { prisma } from '../config/db.js';

// Auto-close plans once the trip has started (runs hourly).
export function scheduleClosePlans() {
  cron.schedule('0 * * * *', async () => {
    const { count } = await prisma.travelPlan.updateMany({
      where: { status: { not: 'CLOSED' }, startDate: { lte: new Date() } },
      data: { status: 'CLOSED' },
    });
    if (count) console.log(`[jobs] closed ${count} plan(s)`);
    // TODO: invalidate explore cache
  });
}
