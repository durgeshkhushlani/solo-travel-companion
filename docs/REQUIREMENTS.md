# Requirements

Written with the terms from [`UBIQUITOUS_LANGUAGE.md`](../UBIQUITOUS_LANGUAGE.md) only (Lecture 1: user requirements vs system requirements; Lecture 2: stories and scenarios).

## Stakeholders

| Stakeholder | What they need |
|---|---|
| **Traveler (User)** | Find a Travel Plan that fits, join it safely, talk to Companions before the trip. |
| **Host** | Publish a Travel Plan, control who joins, never exceed Max Companions. |
| **Admin** | Remove abusive Users and Travel Plans without touching the database by hand. |
| **Course instructor** | A deployed product whose docs match its code, with tests that protect the rules. |

## Feasibility (Lecture 1)

- Supports the goal: solo travelers meeting safely before a trip.
- Buildable in one semester by four people on a free hosting tier.
- Integrates only with services that have a free tier: Postgres, Cloudinary, Gemini.

## User requirements → system requirements

Each user requirement (UR) maps to measurable system requirements (SR).

### Accounts

| UR | SR |
|---|---|
| UR-1 A User can register and log in. | SR-1.1 Passwords are stored hashed (bcrypt). SR-1.2 A Session is an httpOnly cookie that expires in 7 days. SR-1.3 Registering with an existing email returns `409`. |
| UR-2 A User controls their Profile. | SR-2.1 Email is returned only to that User and Admins. SR-2.2 API responses never contain a password hash. |

### Travel Plans

| UR | SR |
|---|---|
| UR-3 A Host publishes a Travel Plan with an Itinerary. | SR-3.1 A Travel Plan needs a destination, a start date and an end date no earlier than the start date. SR-3.2 Itinerary Days are ordered. |
| UR-4 A Host limits the group size. | SR-4.1 Accepted Companions never exceed Max Companions. SR-4.2 Reaching the limit sets Plan Status to `FULL`. |
| UR-5 A Travel Plan stops accepting requests when the trip starts. | SR-5.1 Auto-Close sets Plan Status to `CLOSED` once the start date has passed. SR-5.2 A `CLOSED` plan rejects new Join Requests. |
| UR-6 A User finds plans easily. | SR-6.1 Explore Feed is paginated (20 per page). SR-6.2 Filter by interest, date range and open-only. |

### Joining and friends

| UR | SR |
|---|---|
| UR-7 A User asks to join a Travel Plan. | SR-7.1 At most one Join Request per User per Travel Plan. SR-7.2 A Host cannot request their own plan. |
| UR-8 Only the Host decides. | SR-8.1 Only the Host can Accept or Reject. SR-8.2 Only the requester can Cancel, and only while `PENDING`. |
| UR-9 Companions become Friends. | SR-9.1 Accepting a Join Request creates one `ACCEPTED` Friendship between Host and Companion. SR-9.2 A pair of Users has at most one Friendship. |
| UR-10 A User can stop contact. | SR-10.1 A blocked User cannot send a Join Request, Friend Request or Message to the blocker. |
| UR-11 Friends can chat. | SR-11.1 Private Chat is allowed only between Friends who have not blocked each other. SR-11.2 Messages are delivered in real time and counted in an Unread Badge. |

### AI layer

| UR | SR |
|---|---|
| UR-12 A Host gets a draft Itinerary. | SR-12.1 The Itinerary Generator returns a Generated Itinerary with one Itinerary Day per trip day. SR-12.2 Output that does not match the expected shape is rejected, never saved. |
| UR-13 A User sees plans and people that fit them. | SR-13.1 Companion Matching ranks by Embedding similarity combined with shared Interests and date overlap. SR-13.2 Each Best Match carries a Match Reason. |
| UR-14 A User asks questions in plain language. | SR-14.1 The Travel Assistant answers only from Assistant Tool results. SR-14.2 Assistant Tools never return data the asking User could not see in the app. SR-14.3 The tool loop stops after 5 steps. |

### Admin

| UR | SR |
|---|---|
| UR-15 An Admin keeps the platform clean. | SR-15.1 Admin routes reject Users without role `ADMIN` with `403`. SR-15.2 Account Deactivation blocks login without deleting data. SR-15.3 Moderation can remove a Travel Plan. |

## Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | State-changing requests carry a CSRF token (double-submit). |
| NFR-2 | Every rule in `DESIGN.md` has a test, or `TESTING.md` says why not. |
| NFR-3 | Core rules run with no database, network or LLM; tests use fakes. |
| NFR-4 | The Explore Feed answers in under 1 s for 1,000 Travel Plans. |
| NFR-5 | The app runs locally in five commands or fewer. |

## User stories (Lecture 2)

- As a **User**, I want to filter the Explore Feed by interest and dates, so I only see Travel Plans I could join.
- As a **User**, I want to send a Join Request, so the Host can consider me.
- As a **Host**, I want to Accept or Reject Join Requests, so I choose my Companions.
- As a **Host**, I want the plan to go `FULL` at Max Companions, so I never overbook.
- As a **Companion**, I want to become Friends with the Host on acceptance, so we can chat before the trip.
- As a **User**, I want to Block someone, so they cannot contact me.
- As a **Host**, I want a draft Itinerary from the Itinerary Generator, so I do not start from a blank page.
- As a **User**, I want Recommended for You, so the best plans appear first.
- As a **User**, I want to ask the Travel Assistant "any open trek plans in March?", so I do not browse manually.
- As an **Admin**, I want to deactivate a User, so abuse stops without deleting history.
