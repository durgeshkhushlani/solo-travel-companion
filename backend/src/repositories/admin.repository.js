// Platform Stats: aggregate counts for the Admin Panel.
export function makeAdminRepository(db) {
  return {
    async stats() {
      const [users, plans, requests, messages] = await Promise.all([
        db.user.count(),
        db.travelPlan.count(),
        db.joinRequest.count(),
        db.message.count(),
      ]);
      return { users, plans, requests, messages };
    },
  };
}
