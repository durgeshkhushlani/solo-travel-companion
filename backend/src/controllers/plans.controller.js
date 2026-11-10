// Thin HTTP layer for Travel Plans, Join Requests and Companions: read the request, call the
// service, shape the response.
export function createPlansController({ plans, requests }) {
  const me = (req) => req.user.id;

  return {
    create: async (req, res) =>
      res.status(201).json({ plan: await plans.create(me(req), req.body) }),
    explore: async (req, res) => res.json(await plans.explore(req.query)),
    get: async (req, res) => res.json({ plan: await plans.get(req.params.id) }),
    update: async (req, res) =>
      res.json({ plan: await plans.update(me(req), req.params.id, req.body) }),
    remove: async (req, res) => {
      await plans.remove(me(req), req.params.id);
      res.status(204).end();
    },

    sendRequest: async (req, res) =>
      res.status(201).json({ request: await requests.send(me(req), req.params.id) }),
    listRequests: async (req, res) =>
      res.json({ items: await requests.listForPlan(me(req), req.params.id) }),
    companions: async (req, res) => res.json({ items: await requests.companions(req.params.id) }),
    leave: async (req, res) => {
      await requests.leave(me(req), req.params.id);
      res.status(204).end();
    },
    removeCompanion: async (req, res) => {
      await requests.removeCompanion(me(req), req.params.id, req.params.userId);
      res.status(204).end();
    },
  };
}

export function createRequestsController({ requests }) {
  const me = (req) => req.user.id;

  return {
    mine: async (req, res) => res.json({ items: await requests.mine(me(req)) }),
    accept: async (req, res) => res.json(await requests.accept(me(req), req.params.id)),
    reject: async (req, res) =>
      res.json({ request: await requests.reject(me(req), req.params.id) }),
    cancel: async (req, res) =>
      res.json({ request: await requests.cancel(me(req), req.params.id) }),
  };
}
