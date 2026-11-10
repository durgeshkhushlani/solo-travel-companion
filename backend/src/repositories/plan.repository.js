import { prisma } from '../config/db.js';
import { PlanStatus } from '../domain/enums.js';

export const planRepository = {
  // Same rule as domain/plan.js hasStarted: a plan has started from its start date itself.
  async closeStartedBy(now) {
    const { count } = await prisma.travelPlan.updateMany({
      where: { status: { not: PlanStatus.CLOSED }, startDate: { lte: now } },
      data: { status: PlanStatus.CLOSED },
    });
    return count;
  },
};
