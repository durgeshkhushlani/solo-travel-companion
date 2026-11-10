import { spotsLeft, statusFor } from '../../domain/plan.js';

/**
 * The slice of plan storage the Assistant Tools need. Each plan carries `acceptedCount`.
 * @typedef {{
 *   search(filters: { destination?: string, interest?: string, from?: Date, to?: Date }): Promise<object[]>,
 *   findById(id: string): Promise<object | null>
 * }} PlanSearch
 */

const MAX_RESULTS = 5;

// Allow-list projection: only these fields ever reach the model. Host emails and Join Requests
// are not listed, so they cannot leak even if the repository returns them.
function compactPlan(plan, now) {
  const accepted = plan.acceptedCount ?? 0;
  return {
    id: plan.id,
    title: plan.title,
    destination: plan.destination,
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
    spotsLeft: spotsLeft(plan, accepted),
    status: statusFor(plan, accepted, now),
  };
}

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const date = (value) => {
  const parsed = new Date(value);
  return text(value) && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
};

export function buildAssistantTools({ plans, now, viewerId }) {
  return [
    {
      name: 'search_plans',
      description: 'Find upcoming Travel Plans by destination, interest or date range.',
      parameters: {
        type: 'object',
        properties: {
          destination: { type: 'string' },
          interest: { type: 'string' },
          from: { type: 'string', description: 'Earliest start date, ISO 8601' },
          to: { type: 'string', description: 'Latest start date, ISO 8601' },
        },
      },
      async run(args) {
        const filters = {
          destination: text(args.destination),
          interest: text(args.interest),
          from: date(args.from),
          to: date(args.to),
        };
        const found = await plans.search(filters);
        // The viewer's own plans are not something to "find and join".
        const items = found
          .filter((plan) => plan.hostId !== viewerId)
          .slice(0, MAX_RESULTS)
          .map((plan) => compactPlan(plan, now));
        return { items };
      },
    },
    {
      name: 'get_plan_summary',
      description: 'Get one Travel Plan with its Itinerary Day titles.',
      parameters: {
        type: 'object',
        properties: { planId: { type: 'string' } },
        required: ['planId'],
      },
      async run(args) {
        const plan = text(args.planId) ? await plans.findById(args.planId.trim()) : null;
        if (!plan) return { error: 'not found' };
        const dayTitles = (plan.itinerary ?? []).map((day) => day.title);
        return { ...compactPlan(plan, now), dayTitles };
      },
    },
  ];
}
