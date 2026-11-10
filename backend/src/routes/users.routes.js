import { Router } from 'express';
import { createUsersController } from '../controllers/friends.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import { updateProfileSchema, userIdParamSchema } from '../validation/user.schemas.js';

export function userRoutes({ users }) {
  const c = createUsersController({ users });
  const router = Router();

  router.use(requireAuth);
  router.patch('/me', validate(updateProfileSchema), wrap(c.updateMe));
  router.get('/:id', validate(userIdParamSchema, 'params'), wrap(c.get));

  return router;
}
