import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validation/plan.schemas.js';

const activeSchema = z.object({ active: z.boolean() });

export function adminRoutes({ admin }) {
  const router = Router();
  const idParam = validate(idParamSchema, 'params');

  router.use(requireAuth, requireAdmin);
  router.get(
    '/stats',
    wrap(async (req, res) => res.json(await admin.stats())),
  );
  router.get(
    '/users',
    wrap(async (req, res) => res.json({ items: await admin.users(req.user) })),
  );
  router.patch(
    '/users/:id',
    idParam,
    validate(activeSchema),
    wrap(async (req, res) =>
      res.json({ user: await admin.setActive(req.user, req.params.id, req.body.active) }),
    ),
  );
  router.get(
    '/plans',
    wrap(async (req, res) => res.json({ items: await admin.plans() })),
  );
  router.delete(
    '/plans/:id',
    idParam,
    wrap(async (req, res) => {
      await admin.removePlan(req.params.id);
      res.status(204).end();
    }),
  );

  return router;
}
