import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validation/plan.schemas.js';
import { assistantRequestSchema, itineraryRequestSchema } from '../validation/ai.schemas.js';

const AI_REQUESTS_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;

export function aiRoutes({ ai, clock }) {
  const router = Router();
  const me = (req) => req.user.id;
  // Only the calls that always reach the model are limited; recommendations are cached.
  const limited = rateLimit({ max: AI_REQUESTS_PER_HOUR, windowMs: HOUR_MS, clock });

  router.use(requireAuth);

  router.post(
    '/itinerary',
    limited,
    validate(itineraryRequestSchema),
    wrap(async (req, res) => res.json(await ai.itinerary(req.body))),
  );
  router.get(
    '/recommendations',
    wrap(async (req, res) => res.json({ items: await ai.recommendations(me(req)) })),
  );
  router.get(
    '/plans/:id/matches',
    validate(idParamSchema, 'params'),
    wrap(async (req, res) => res.json({ items: await ai.matches(me(req), req.params.id) })),
  );
  router.post(
    '/assistant',
    limited,
    validate(assistantRequestSchema),
    wrap(async (req, res) => res.json(await ai.assistant(me(req), req.body.messages))),
  );

  return router;
}
