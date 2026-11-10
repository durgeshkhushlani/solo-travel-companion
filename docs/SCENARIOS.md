# Scenarios

Structured scenarios (Lecture 2): starting assumptions, normal flow, failure handling, end state. The failure clauses are where the five product rules come from; each rule is later tested (see `TESTING.md`).

## S1. Join a Travel Plan

**Assumptions:** Asha is a User. Ravi is a Host whose Travel Plan "Spiti in March" has Max Companions 2, one Companion accepted, and Plan Status `OPEN`.

**Normal flow**
1. Asha opens the plan from the Explore Feed and sends a Join Request (`PENDING`).
2. Ravi accepts it.
3. Asha becomes a Companion. Spots Left is now 0, so Plan Status becomes `FULL`.
4. Asha and Ravi become Friends and can open a Private Chat.

**Failures**
- **F1.1 Plan is already `FULL`.** A third Join Request is refused. → *Rule 1: accepted Companions never exceed Max Companions.*
- **F1.2 Two Join Requests are accepted at the same moment for the last spot.** Only one succeeds; the other stays `PENDING`. → *Rule 1.*
- **F1.3 Someone other than Ravi tries to accept.** Refused with `403`. → *Rule 2: only the Host decides.*
- **F1.4 Asha already has a Join Request on this plan.** Refused with `409`.
- **F1.5 Ravi requests his own plan.** Refused.

**End state:** one `ACCEPTED` Join Request, one Companion, one Friendship, Plan Status `FULL`.

## S2. A trip starts

**Assumptions:** A Travel Plan has start date 1 March and Plan Status `OPEN`. A `PENDING` Join Request exists.

**Normal flow**
1. The hourly Auto-Close job runs on 1 March or later.
2. Plan Status becomes `CLOSED`.

**Failures**
- **F2.1 A User sends a Join Request after Auto-Close.** Refused. → *Rule 3: a Travel Plan becomes `CLOSED` once its start date has passed.*
- **F2.2 The job runs twice.** The second run changes nothing (idempotent).
- **F2.3 The start date is today.** Boundary: closed from the start date itself, not the day after. (Lecture 9–10: on-point and off-point.)

**End state:** the plan is `CLOSED`; existing Companions are unaffected.

## S3. Block a User

**Assumptions:** Ravi has Blocked Mohan.

**Normal flow:** Mohan's Join Requests and Messages to Ravi are refused.

**Failures**
- **F3.1 Mohan sends a Join Request to Ravi's plan.** Refused. → *Rule 4: a blocked User cannot send Join Requests or Messages to the blocker.*
- **F3.2 Mohan sends a Message to Ravi although they were Friends.** Refused.
- **F3.3 Ravi Unblocks Mohan.** Contact works again; the old Friendship still exists.

**End state:** no new contact from Mohan to Ravi until Unblock.

## S4. Accepted Companion becomes Friend

**Assumptions:** Ravi and Asha are not yet Friends.

**Normal flow:** accepting Asha's Join Request creates an `ACCEPTED` Friendship.

**Failures**
- **F4.1 They are already Friends from an earlier trip.** No second Friendship is created. → *Rule 5: accepting a Join Request makes Host and Companion Friends, once only.*
- **F4.2 Ravi has Blocked Asha.** The Join Request was never allowed (Rule 4), so no Friendship appears.

**End state:** exactly one Friendship for the pair.

## S5. Generate an Itinerary (AI)

**Assumptions:** A Host fills destination, dates, budget and Interests on the Create Plan form.

**Normal flow**
1. The Itinerary Generator asks Gemini for a Generated Itinerary as JSON.
2. The reply is parsed into the expected shape.
3. The Host edits the draft and saves the Travel Plan.

**Failures**
- **F5.1 Gemini returns text that is not valid JSON.** One retry, then a clear error; nothing is saved.
- **F5.2 The JSON has the wrong number of Itinerary Days.** Rejected by the parser.
- **F5.3 Gemini is down or the key is wrong.** The form still works without a draft.

**End state:** a draft the User reviewed, never an unchecked AI output.

## S6. Ask the Travel Assistant

**Assumptions:** Asha asks "open trek plans in March under ₹20k?".

**Normal flow:** the Travel Assistant calls the search Assistant Tool, receives plans, and answers from them.

**Failures**
- **F6.1 The model asks for a tool that does not exist.** The loop returns an error to the model and continues.
- **F6.2 The model keeps calling tools.** The loop stops after 5 steps.
- **F6.3 A tool would expose a private email or a `CLOSED` plan's pending requests.** Tools use the same visibility rules as the app, so it returns nothing.

**End state:** an answer grounded in tool results, or an honest "I could not find that".
