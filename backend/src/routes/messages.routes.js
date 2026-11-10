import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as wrap } from '../utils/asyncHandler.js';
import { otherUserParamSchema } from '../validation/user.schemas.js';

// History and read receipts over REST; live delivery is the `private:message` socket event.
export function messageRoutes({ messages }) {
  const router = Router();
  const otherUser = validate(otherUserParamSchema, 'params');

  router.use(requireAuth);
  router.get(
    '/conversations',
    wrap(async (req, res) => res.json({ items: await messages.conversations(req.user.id) })),
  );
  router.get(
    '/:userId',
    otherUser,
    wrap(async (req, res) =>
      res.json({ items: await messages.history(req.user.id, req.params.userId) }),
    ),
  );
  router.post(
    '/:userId/read',
    otherUser,
    wrap(async (req, res) => {
      await messages.markRead(req.user.id, req.params.userId);
      res.status(204).end();
    }),
  );

  return router;
}
