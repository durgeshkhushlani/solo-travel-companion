import { toSummary, toUserDto } from '../utils/dto.js';

const toFriendDto = (row) => ({ friendshipId: row.friendshipId, user: toSummary(row.user) });

export function createFriendsController({ friends }) {
  const me = (req) => req.user.id;

  return {
    list: async (req, res) => res.json({ items: (await friends.list(me(req))).map(toFriendDto) }),
    pending: async (req, res) =>
      res.json({ items: (await friends.pending(me(req))).map(toFriendDto) }),
    sendRequest: async (req, res) =>
      res.status(201).json(await friends.sendRequest(me(req), req.body.userId)),
    accept: async (req, res) => res.json(await friends.accept(me(req), req.params.id)),
    unfriend: async (req, res) => {
      await friends.unfriend(me(req), req.params.userId);
      res.status(204).end();
    },
    blocks: async (req, res) => res.json({ items: (await friends.blocks(me(req))).map(toSummary) }),
    block: async (req, res) => {
      await friends.block(me(req), req.body.userId);
      res.status(201).end();
    },
    unblock: async (req, res) => {
      await friends.unblock(me(req), req.params.userId);
      res.status(204).end();
    },
  };
}

export function createUsersController({ users }) {
  return {
    get: async (req, res) =>
      res.json({ user: toUserDto(await users.get(req.params.id), req.user) }),
    updateMe: async (req, res) => {
      const updated = await users.update(req.user.id, req.body);
      res.json({ user: toUserDto(updated, updated) });
    },
  };
}
