import { Router } from 'express';
import { createPlansController } from '../controllers/plans.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import {
  createPlanSchema,
  exploreQuerySchema,
  idParamSchema,
  planUserParamSchema,
  updatePlanSchema,
} from '../validation/plan.schemas.js';

export function planRoutes({ plans, requests }) {
  const c = createPlansController({ plans, requests });
  const router = Router();
  const idParam = validate(idParamSchema, 'params');

  router.use(requireAuth);
  router.post('/', validate(createPlanSchema), wrap(c.create));
  router.get('/', validate(exploreQuerySchema, 'query'), wrap(c.explore));
  router.get('/:id', idParam, wrap(c.get));
  router.patch('/:id', idParam, validate(updatePlanSchema), wrap(c.update));
  router.delete('/:id', idParam, wrap(c.remove));

  router.post('/:id/requests', idParam, wrap(c.sendRequest));
  router.get('/:id/requests', idParam, wrap(c.listRequests));
  router.get('/:id/companions', idParam, wrap(c.companions));
  // "me" is matched before the :userId route so it is never parsed as a user id.
  router.delete('/:id/companions/me', idParam, wrap(c.leave));
  router.delete(
    '/:id/companions/:userId',
    validate(planUserParamSchema, 'params'),
    wrap(c.removeCompanion),
  );

  return router;
}
