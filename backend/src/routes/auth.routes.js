import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validation/auth.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function authRoutes(auth) {
  const controller = createAuthController(auth);
  const router = Router();

  router.post('/register', validate(registerSchema), asyncHandler(controller.register));
  router.post('/login', validate(loginSchema), asyncHandler(controller.login));
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, asyncHandler(controller.me));

  return router;
}
