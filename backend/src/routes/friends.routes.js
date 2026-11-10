import { Router } from 'express';
import { createFriendsController } from '../controllers/friends.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validation/plan.schemas.js';
import { otherUserParamSchema, targetBodySchema } from '../validation/user.schemas.js';

export function friendRoutes({ friends }) {
  const c = createFriendsController({ friends });
  const router = Router();
  const target = validate(targetBodySchema);
  const otherUser = validate(otherUserParamSchema, 'params');

  router.use(requireAuth);
  router.get('/', wrap(c.list));
  router.get('/requests', wrap(c.pending));
  router.post('/requests', target, wrap(c.sendRequest));
  router.post('/requests/:id/accept', validate(idParamSchema, 'params'), wrap(c.accept));
  router.get('/blocks', wrap(c.blocks));
  router.post('/blocks', target, wrap(c.block));
  router.delete('/blocks/:userId', otherUser, wrap(c.unblock));
  router.delete('/:userId', otherUser, wrap(c.unfriend));

  return router;
}
