# API contract

The single source for what the frontend and backend agree on. Base path `/api`. JSON in and out. Auth is the `stc_token` httpOnly cookie. Every state-changing request (anything but GET) except `POST /auth/login` and `POST /auth/register` must send the `stc_csrf` cookie value in the `x-csrf-token` header. Terms follow [`UBIQUITOUS_LANGUAGE.md`](../UBIQUITOUS_LANGUAGE.md).

**Errors** always look like `{ "error": "message" }`, plus `"details"` (zod flatten) on `400`. Statuses: `400` bad input, `401` no session, `403` not allowed, `404` not found, `409` conflict with current state.

## Shapes

```
UserDto      { id, name, bio, photoUrl, interests[], travelStyle, role, email? }   // email only for self/Admin
HostSummary  { id, name, photoUrl }
ItineraryDay { day: 1.., title, activities: string[] }
PlanDto      { id, title, destination, description, coverUrl, startDate, endDate, interests[],
               maxCompanions|null, acceptedCount, spotsLeft|null,
               status: "OPEN"|"FULL"|"CLOSED",     // derived at read time, never stale
               itinerary: ItineraryDay[], host: HostSummary, createdAt }
Page<T>      { items: T[], total, page, pageSize }
RequestDto   { id, status: "PENDING"|"ACCEPTED"|"REJECTED"|"CANCELLED", createdAt, user: HostSummary, plan: { id, title, startDate } }
FriendDto    { friendshipId, user: HostSummary }
MessageDto   { id, senderId, receiverId, body, readAt|null, createdAt }
```

## Auth (built)

| Method & path | Body | Success |
|---|---|---|
| `POST /auth/register` | `{ name, email, password }` | `201 { user }` |
| `POST /auth/login` | `{ email, password }` | `200 { user }` |
| `POST /auth/logout` | | `204` |
| `GET /auth/me` | | `200 { user }` |

## Users

| `GET /users/:id` | | `200 { user: UserDto }` |
|---|---|---|
| `PATCH /users/me` | `{ name?, bio?, interests?, travelStyle?, photoUrl? }` | `200 { user }` |

## Travel Plans

| Method & path | Notes | Success |
|---|---|---|
| `POST /plans` | body: `{ title, destination, description?, coverUrl?, startDate, endDate, interests?, maxCompanions?, itinerary? }` | `201 { plan: PlanDto }` |
| `GET /plans` | Explore Feed. Query: `q, interest (comma list), from, to, openOnly, hideEnded (default true), page, pageSize` | `200 Page<PlanDto>` |
| `GET /plans/:id` | | `200 { plan: PlanDto }` |
| `PATCH /plans/:id` | Host only; any create field | `200 { plan }` |
| `DELETE /plans/:id` | Host only | `204` |

## Join Requests and Companions

| Method & path | Notes | Success |
|---|---|---|
| `POST /plans/:id/requests` | send a Join Request | `201 { request: RequestDto }` |
| `GET /plans/:id/requests` | Host only | `200 { items: RequestDto[] }` |
| `GET /requests/mine` | my Join Requests | `200 { items: RequestDto[] }` |
| `POST /requests/:id/accept` | Host only | `200 { request, plan }` |
| `POST /requests/:id/reject` | Host only | `200 { request }` |
| `POST /requests/:id/cancel` | requester only | `200 { request }` |
| `DELETE /plans/:id/companions/me` | Leave Trip | `204` |
| `DELETE /plans/:id/companions/:userId` | Host removes a Companion | `204` |
| `GET /plans/:id/companions` | | `200 { items: HostSummary[] }` |

## Friends and Block

| Method & path | Notes | Success |
|---|---|---|
| `GET /friends` | accepted Friends | `200 { items: FriendDto[] }` |
| `GET /friends/requests` | Friend Requests sent to me | `200 { items: FriendDto[] }` |
| `POST /friends/requests` | `{ userId }` | `201 { friendshipId }` |
| `POST /friends/requests/:id/accept` | addressee only | `200 { friendshipId }` |
| `DELETE /friends/:userId` | Unfriend | `204` |
| `GET /friends/blocks` | | `200 { items: HostSummary[] }` |
| `POST /friends/blocks` | `{ userId }` | `201` |
| `DELETE /friends/blocks/:userId` | Unblock | `204` |

## Private Chat

REST for history, Socket.IO for live delivery. Only Friends who have not blocked each other.

| Method & path | Notes | Success |
|---|---|---|
| `GET /messages/conversations` | one row per Friend with last message and Unread Badge | `200 { items: [{ user: HostSummary, last: MessageDto\|null, unread: number }] }` |
| `GET /messages/:userId` | history with that Friend, oldest first | `200 { items: MessageDto[] }` |
| `POST /messages/:userId/read` | marks their messages to me as read | `204` |

Socket.IO connects to the API origin with credentials (the same cookie). Client emits `private:message` `{ to: userId, body }` with an ack `{ ok: true, message } \| { ok: false, error }`. Server emits `private:message` `MessageDto` to both Users' rooms.

## Admin (role `ADMIN`, else `403`)

| Method & path | Notes | Success |
|---|---|---|
| `GET /admin/stats` | Platform Stats | `200 { users, plans, requests, messages }` |
| `GET /admin/users` | | `200 { items: [UserDto & { active }] }` |
| `PATCH /admin/users/:id` | `{ active: boolean }` Account Deactivation | `200 { user }` |
| `GET /admin/plans` | | `200 { items: PlanDto[] }` |
| `DELETE /admin/plans/:id` | Moderation | `204` |

## AI

| Method & path | Notes | Success |
|---|---|---|
| `POST /ai/itinerary` | `{ destination, startDate, endDate, budget?, interests? }` | `200 { itinerary: ItineraryDay[] }`; `502` if the model keeps returning unusable output; `503` if no key is configured |
| `GET /ai/recommendations` | Recommended for You | `200 { items: [{ plan: PlanDto, score: number, reason: string }] }` |
| `GET /ai/plans/:id/matches` | Best Match travelers for a plan (Host only) | `200 { items: [{ user: HostSummary, score, reason }] }` |
| `POST /ai/assistant` | `{ messages: [{ role: "user"\|"assistant", content }] }` | `200 { reply: string, steps: number }` |
