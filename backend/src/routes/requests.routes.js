import { Router } from 'express';
import { createRequestsController } from '../controllers/plans.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validation/plan.schemas.js';

export function requestRoutes({ requests }) {
  const c = createRequestsController({ requests });
  const router = Router();
  const idParam = validate(idParamSchema, 'params');

  router.use(requireAuth);
  router.get('/mine', wrap(c.mine));
  router.post('/:id/accept', idParam, wrap(c.accept));
  router.post('/:id/reject', idParam, wrap(c.reject));
  router.post('/:id/cancel', idParam, wrap(c.cancel));

  return router;
}
