# Ubiquitous Language: Solo Travel Companion (STC)

The shared vocabulary for the STC team. Use these terms, and only these terms, in conversation, documentation, code (models, routes, components), tests and UI copy. If a term is missing or wrong, change this file first.

## People and accounts

| Term | Definition | Avoid |
|---|---|---|
| **User** | A registered person on the platform with a profile and login. Role is `USER` or `ADMIN`. | member, account holder |
| **Admin** | A User with role `ADMIN`; can moderate users, plans, community and packages. | moderator, superuser |
| **Profile** | A User's public identity: name, photo, bio, interests, travel style and stats. Email is private. | page, bio page |
| **Interests** | Tags a User or Travel Plan is associated with (e.g. trekking, food). | hobbies, tags |
| **Travel Style** | A User's preferred way of travelling (e.g. budget, luxury, adventure); used in matching. | travel type |
| **Session** | A logged-in state held by a JWT in an httpOnly cookie. | token login |

## Trips

| Term | Definition | Avoid |
|---|---|---|
| **Travel Plan** | A trip published by a Host: destination, dates, cover photo, Itinerary, optional companion limit. | trip, journey, post, listing |
| **Host** | The User who created a Travel Plan. | owner, creator, organizer |
| **Itinerary** | The ordered day-by-day schedule inside a Travel Plan. | schedule, route, agenda |
| **Itinerary Day** | One day of an Itinerary: a title and a list of activities. | step, stop |
| **Cover Photo** | The main image of a Travel Plan, stored in Cloudinary. | banner, thumbnail |
| **Max Companions** | The optional limit on accepted Companions for a Travel Plan. | capacity, seats |
| **Spots Left** | Max Companions minus accepted Companions; shown as "2/3 joined". | vacancies |
| **Plan Status** | `OPEN` (accepting requests), `FULL` (limit reached), `CLOSED` (trip started or closed by Host). | active/inactive |
| **Auto-Close** | The scheduled job that sets a Travel Plan to `CLOSED` once its start date has passed. | expire |

## Joining a trip

| Term | Definition | Avoid |
|---|---|---|
| **Join Request** | A User's request to join someone else's Travel Plan. States: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`. | application, invite |
| **Accept / Reject** | The Host's decision on a pending Join Request. | approve/deny |
| **Cancel** | The requester withdraws their own pending Join Request. | withdraw |
| **Companion** | A User whose Join Request on a Travel Plan was accepted. | member, participant, joiner |
| **Leave Trip** | A Companion removes themselves from a Travel Plan. | quit, exit |
| **Remove Companion** | The Host removes a Companion from their Travel Plan. | kick, ban |
| **Trips Hosted / Trips Joined** | Profile stats: Travel Plans the User hosts / is a Companion on. | created, attended |

## Social

| Term | Definition | Avoid |
|---|---|---|
| **Friend** | A mutual connection between two Users, from an accepted Friend Request or from becoming Companions. | contact, buddy |
| **Friend Request** | A pending request from one User to another to become Friends. | follow, invite |
| **Unfriend** | Ending a Friendship. | remove contact |
| **Block / Unblock** | One User prevents another from contacting or befriending them, and reverses it. | mute, ban |
| **Private Chat** | Real-time one-to-one messaging between Friends. | DM, inbox |
| **Message** | A single chat entry in a Private Chat. | text, note |
| **Unread Badge** | The count of unread Messages shown on a chat. | notification dot |
| **Community Room** | The single public real-time chat open to all logged-in Users, with history. | forum, lobby, global chat |
| **Presence** | Whether a User is currently online. | status |

## Discovery

| Term | Definition | Avoid |
|---|---|---|
| **Explore Feed** | The paginated, filterable, searchable list of Travel Plans. Cached in Redis. | home feed, marketplace |
| **Filter** | Narrowing the Explore Feed by interest, date range, open-only or hide-ended. | facet |
| **Feed Cache** | The Redis copy of Explore Feed results, invalidated when plans or profiles change. | cache layer |
| **Featured Package** | A curated travel package an Admin promotes on the platform. | ad, promo |

## AI layer

| Term | Definition | Avoid |
|---|---|---|
| **Itinerary Generator** | AI feature that turns destination, dates, budget and interests into a structured Itinerary that pre-fills the Create Plan form. | trip bot |
| **Generated Itinerary** | The JSON day-by-day output of the Itinerary Generator; a draft the User edits before saving. | AI plan |
| **Embedding** | A vector representing a Travel Plan or User Profile, stored in Postgres with pgvector. | fingerprint |
| **Companion Matching** | Ranking Travel Plans and Users by Embedding similarity. | recommendation engine |
| **Recommended for You** | The Explore Feed ranking produced by Companion Matching for the current User. | suggested |
| **Best Match** | A traveler ranked as a good fit for a given Travel Plan. | top user |
| **Match Reason** | The short "why this match" line shown with a Best Match. | explanation |
| **Travel Assistant** | The chatbot agent that answers questions using tools against real platform data. | AI chat, bot |
| **Assistant Tool** | A function the Travel Assistant can call: search plans, check availability, suggest companions. | plugin, action |
| **Moderation Flag** | (Optional) An AI mark on a Community Room message for spam, abuse or scams, shown to Admins. | report |

## Admin

| Term | Definition | Avoid |
|---|---|---|
| **Admin Panel** | The role-restricted area for platform stats, user management and moderation. | dashboard, backoffice |
| **Platform Stats** | Aggregate counts shown to Admins (users, plans, requests, etc.). | analytics |
| **Account Deactivation** | An Admin disabling a User's ability to log in without deleting their data. | ban, suspend |
| **Moderation** | Admin review and removal of Travel Plans or Community Room messages. | censorship |

## Key rules (invariants)

- A Travel Plan has exactly one Host; the Host is never a Companion of their own plan.
- A User has at most one Join Request per Travel Plan.
- Accepted Companions never exceed Max Companions; reaching it sets the plan to `FULL`.
- A Travel Plan becomes `CLOSED` once its start date has passed.
- Accepting a Join Request makes the Companion and the Host Friends.
- A Friendship exists once per pair of Users.
- Private Chat is only allowed between Friends who have not blocked each other.
- A User's email is visible only to that User and Admins; API responses never include password hashes.
