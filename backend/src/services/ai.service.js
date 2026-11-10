import { runAssistant } from '../ai/assistant/assistant.js';
import { buildAssistantTools } from '../ai/assistant/tools.js';
import { generateItinerary } from '../ai/itinerary/generate.js';
import { planEmbeddingText, profileEmbeddingText } from '../ai/matching/embeddingText.js';
import { rankPlansForUser, rankUsersForPlan } from '../ai/matching/rank.js';
import { AiErrorCode } from '../ai/ports.js';
import { notFound } from '../domain/errors.js';
import { assertDatesOrdered, assertHost } from '../domain/plan.js';
import { toPlanDto, toSummary } from '../utils/dto.js';

const FEED_CANDIDATES = { page: 1, pageSize: 50 };
const OPEN_UPCOMING = { interest: [], hideEnded: true, openOnly: true };
const TOP_PLANS = 10;
const TOP_MATCHES = 5;
// Each request may create at most this many new Embeddings, which bounds latency and cost.
const NEW_EMBEDDINGS_PER_REQUEST = 15;

const round = (n) => Math.round(n * 1000) / 1000;
// The API speaks "assistant"; the model port speaks "model".
const toModelRole = (role) => (role === 'assistant' ? 'model' : role);

// The AI layer's use cases over real data. The Gemini client is injected as `llm` and
// `embedder`; if the Embedder is down, ranking falls back to Interests and dates.
export function createAiService({ repos, llm, embedder, clock }) {
  // Embeddings for these rows: stored ones, plus new ones up to the per-request budget.
  async function embeddingsFor(rows, { read, write, textOf }) {
    const found = await read(rows.map((r) => r.id));
    let budget = NEW_EMBEDDINGS_PER_REQUEST;
    for (const row of rows) {
      const text = textOf(row);
      if (found.has(row.id) || !text || budget === 0) continue;
      try {
        const vector = await embedder.embed(text);
        await write(row.id, vector);
        found.set(row.id, vector);
        budget -= 1;
      } catch (err) {
        if (err.code === AiErrorCode.AI_UNAVAILABLE) break;
        throw err;
      }
    }
    return found;
  }

  const planVectors = (plans) =>
    embeddingsFor(plans, {
      read: (ids) => repos.embeddings.getPlans(ids),
      write: (id, v) => repos.embeddings.setPlan(id, v),
      textOf: planEmbeddingText,
    });
  const userVectors = (users) =>
    embeddingsFor(users, {
      read: (ids) => repos.embeddings.getUsers(ids),
      write: (id, v) => repos.embeddings.setUser(id, v),
      textOf: profileEmbeddingText,
    });

  const searchPlans = async (filters, now) =>
    (await repos.plans.search({ ...filters, now }, FEED_CANDIDATES)).items;

  return {
    async itinerary(input) {
      assertDatesOrdered(input.startDate, input.endDate);
      const { days } = await generateItinerary({ llm, input });
      return { itinerary: days };
    },

    // Recommended for You: open upcoming plans ranked by Embedding similarity, shared
    // Interests and dates, each with a Match Reason.
    async recommendations(userId) {
      const user = await repos.users.findById(userId);
      const now = clock.now();
      const plans = await searchPlans(OPEN_UPCOMING, now);
      const [planEmbeddings, userEmbeddings] = await Promise.all([
        planVectors(plans),
        userVectors([user]),
      ]);
      const ranked = rankPlansForUser({
        user,
        userEmbedding: userEmbeddings.get(user.id),
        plans,
        planEmbeddings,
        now,
      });
      return ranked.slice(0, TOP_PLANS).map(({ item, score, reason }) => ({
        plan: toPlanDto(item, now),
        score: round(score),
        reason,
      }));
    },

    // Best Match travelers for a plan, Host only. Leaves out people already in or blocked.
    async matches(actorId, planId) {
      const plan = await repos.plans.findById(planId);
      if (!plan) throw notFound('Travel Plan');
      assertHost(plan, actorId);
      const [users, companions, blocked] = await Promise.all([
        repos.users.list(),
        repos.companions.list(planId),
        repos.blocks.list(actorId),
      ]);
      const exclude = new Set([...companions, ...blocked].map((u) => u.id));
      const candidates = users.filter((u) => u.active && !exclude.has(u.id));
      const [planEmbeddings, userEmbeddings] = await Promise.all([
        planVectors([plan]),
        userVectors(candidates),
      ]);
      const ranked = rankUsersForPlan({
        plan,
        planEmbedding: planEmbeddings.get(plan.id),
        users: candidates,
        userEmbeddings,
        excludeUserIds: exclude,
      });
      return ranked.slice(0, TOP_MATCHES).map(({ item, score, reason }) => ({
        user: toSummary(item),
        score: round(score),
        reason,
      }));
    },

    // Travel Assistant: tools read plans through the same visibility the app has.
    async assistant(userId, messages) {
      const now = clock.now();
      const plans = {
        search: async ({ destination, interest, from, to }) =>
          searchPlans(
            {
              q: destination,
              interest: interest ? [interest.toLowerCase()] : [],
              from,
              to,
              hideEnded: true,
              openOnly: false,
            },
            now,
          ),
        findById: (id) => repos.plans.findById(id),
      };
      const tools = buildAssistantTools({ plans, now, viewerId: userId });
      return runAssistant({
        llm,
        tools,
        messages: messages.map((m) => ({ role: toModelRole(m.role), content: m.content })),
      });
    },
  };
}
