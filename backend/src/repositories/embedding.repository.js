// Embeddings live in pgvector columns that Prisma cannot map, so they are read and written
// with raw SQL. Ranking happens in JavaScript (src/ai/matching), which keeps it explainable
// and testable; Postgres is the store.
const literal = (vector) => `[${vector.join(',')}]`;

// pgvector prints a vector as "[0.1,0.2]", which is valid JSON.
const toMap = (rows) => new Map(rows.map((row) => [row.id, JSON.parse(row.embedding)]));

export function makeEmbeddingRepository(db) {
  return {
    async setPlan(id, vector) {
      await db.$executeRaw`UPDATE "TravelPlan" SET embedding = ${literal(vector)}::vector WHERE id = ${id}`;
    },

    async setUser(id, vector) {
      await db.$executeRaw`UPDATE "User" SET embedding = ${literal(vector)}::vector WHERE id = ${id}`;
    },

    // Called when the text an Embedding was made from changes.
    async clearPlan(id) {
      await db.$executeRaw`UPDATE "TravelPlan" SET embedding = NULL WHERE id = ${id}`;
    },

    async clearUser(id) {
      await db.$executeRaw`UPDATE "User" SET embedding = NULL WHERE id = ${id}`;
    },

    // Map of id -> number[] for the ids that already have an Embedding.
    async getPlans(ids) {
      if (ids.length === 0) return new Map();
      return toMap(
        await db.$queryRaw`SELECT id, embedding::text AS embedding FROM "TravelPlan" WHERE id = ANY(${ids}) AND embedding IS NOT NULL`,
      );
    },

    async getUsers(ids) {
      if (ids.length === 0) return new Map();
      return toMap(
        await db.$queryRaw`SELECT id, embedding::text AS embedding FROM "User" WHERE id = ANY(${ids}) AND embedding IS NOT NULL`,
      );
    },
  };
}
