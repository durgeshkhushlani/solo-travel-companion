import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasStarted } from '../../src/domain/plan.js';
import { planInput, prisma, resetDatabase, signUp, startApp } from './harness.js';

afterAll(() => prisma.$disconnect());
beforeEach(resetDatabase);

describe('Travel Plan CRUD over HTTP', () => {
  it('lets_a_host_publish_read_edit_and_delete_a_plan', async () => {
    const { app } = startApp();
    const ravi = await signUp(app, 'Ravi');

    const created = await ravi.post('/api/plans', planInput());
    const read = await ravi.get(`/api/plans/${created.body.plan.id}`);
    const edited = await ravi.patch(`/api/plans/${created.body.plan.id}`, {
      title: 'Spiti in April',
    });
    const deleted = await ravi.delete(`/api/plans/${created.body.plan.id}`);
    const gone = await ravi.get(`/api/plans/${created.body.plan.id}`);

    expect(created.status).toBe(201);
    expect(read.body.plan).toMatchObject({ title: 'Spiti in March', spotsLeft: 2, status: 'OPEN' });
    expect(edited.body.plan.title).toBe('Spiti in April');
    expect(deleted.status).toBe(204);
    expect(gone.status).toBe(404);
  });

  it('keeps_the_itinerary_stored_as_ordered_days', async () => {
    const { app } = startApp();
    const ravi = await signUp(app, 'Ravi');
    const itinerary = [
      { day: 1, title: 'Arrive in Kaza', activities: ['Check in', 'Acclimatise'] },
      { day: 2, title: 'Key Monastery', activities: [] },
    ];

    const created = await ravi.post('/api/plans', planInput({ itinerary }));

    expect(created.body.plan.itinerary).toEqual(itinerary);
  });

  it('refuses_edits_and_deletes_from_anyone_but_the_host', async () => {
    const { app } = startApp();
    const ravi = await signUp(app, 'Ravi');
    const asha = await signUp(app, 'Asha');
    const { body } = await ravi.post('/api/plans', planInput());

    const edit = await asha.patch(`/api/plans/${body.plan.id}`, { title: 'Hijack' });
    const del = await asha.delete(`/api/plans/${body.plan.id}`);

    expect([edit.status, del.status]).toEqual([403, 403]);
  });

  it('refuses_a_request_without_a_session', async () => {
    const { app } = startApp();

    const anonymous = await request(app).get('/api/plans');

    expect(anonymous.status).toBe(401);
  });

  it('refuses_a_post_that_does_not_repeat_the_csrf_cookie_in_the_header', async () => {
    const { app } = startApp();
    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ name: 'Ravi', email: 'ravi@example.com', password: 'longenough1' });

    const res = await agent.post('/api/plans').send(planInput());

    expect(res.status).toBe(403);
  });

  it('answers_400_with_field_details_for_invalid_input', async () => {
    const { app } = startApp();
    const ravi = await signUp(app, 'Ravi');

    const res = await ravi.post('/api/plans', planInput({ title: 'ab', maxCompanions: 0 }));

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details.fieldErrors)).toEqual(
      expect.arrayContaining(['title', 'maxCompanions']),
    );
  });

  it('answers_400_for_an_id_that_is_not_a_uuid', async () => {
    const { app } = startApp();
    const ravi = await signUp(app, 'Ravi');

    expect((await ravi.get('/api/plans/not-a-uuid')).status).toBe(400);
  });
});

describe('Explore Feed filters on real Postgres', () => {
  async function seed() {
    const { app, time } = startApp();
    const ravi = await signUp(app, 'Ravi');
    const make = (overrides) => ravi.post('/api/plans', planInput(overrides));
    await make({
      title: 'Spiti trek',
      destination: 'Spiti',
      interests: ['trekking'],
      startDate: '2027-03-01T00:00:00.000Z',
      endDate: '2027-03-07T00:00:00.000Z',
    });
    await make({
      title: 'Goa food crawl',
      destination: 'Goa',
      interests: ['food', 'beach'],
      startDate: '2027-04-10T00:00:00.000Z',
      endDate: '2027-04-14T00:00:00.000Z',
    });
    await make({
      title: 'Kerala backwaters',
      destination: 'Alleppey',
      interests: ['beach'],
      startDate: '2027-05-01T00:00:00.000Z',
      endDate: '2027-05-05T00:00:00.000Z',
    });
    return { app, ravi, time };
  }
  const titles = (res) => res.body.items.map((p) => p.title);

  it('returns_soonest_trips_first', async () => {
    const { ravi } = await seed();

    const res = await ravi.get('/api/plans');

    expect(titles(res)).toEqual(['Spiti trek', 'Goa food crawl', 'Kerala backwaters']);
    expect(res.body.total).toBe(3);
  });

  it.each([
    ['text in the title', 'q=crawl', ['Goa food crawl']],
    ['text in the destination, any case', 'q=ALLEPPEY', ['Kerala backwaters']],
    ['one interest', 'interest=trekking', ['Spiti trek']],
    ['any of several interests', 'interest=food,trekking', ['Spiti trek', 'Goa food crawl']],
    ['a start date range', 'from=2027-04-01&to=2027-04-30', ['Goa food crawl']],
    ['a range that matches nothing', 'from=2028-01-01', []],
  ])('filters_by_%s', async (_label, query, expected) => {
    const { ravi } = await seed();

    const res = await ravi.get(`/api/plans?${query}`);

    expect(titles(res)).toEqual(expected);
  });

  it('pages_through_results_with_a_stable_order', async () => {
    const { ravi } = await seed();

    const first = await ravi.get('/api/plans?pageSize=2&page=1');
    const second = await ravi.get('/api/plans?pageSize=2&page=2');

    expect(titles(first)).toEqual(['Spiti trek', 'Goa food crawl']);
    expect(titles(second)).toEqual(['Kerala backwaters']);
    expect(second.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
  });

  it('hides_ended_plans_by_default_and_shows_them_when_asked', async () => {
    const { ravi, time } = await seed();
    time.current = new Date('2027-03-10T00:00:00.000Z');

    const hidden = await ravi.get('/api/plans');
    const shown = await ravi.get('/api/plans?hideEnded=false');

    expect(titles(hidden)).toEqual(['Goa food crawl', 'Kerala backwaters']);
    expect(shown.body.total).toBe(3);
  });

  it('openOnly_leaves_out_full_and_started_plans', async () => {
    const { app, ravi, time } = await seed();
    const asha = await signUp(app, 'Asha');
    const spiti = (await ravi.get('/api/plans?q=spiti')).body.items[0];
    await ravi.patch(`/api/plans/${spiti.id}`, { maxCompanions: 1 });
    const request = await asha.post(`/api/plans/${spiti.id}/requests`);
    await ravi.post(`/api/requests/${request.body.request.id}/accept`);

    const whileFull = await ravi.get('/api/plans?openOnly=true');
    time.current = new Date('2027-04-12T00:00:00.000Z');
    const afterGoaStarted = await ravi.get('/api/plans?openOnly=true&hideEnded=false');

    expect(titles(whileFull)).toEqual(['Goa food crawl', 'Kerala backwaters']);
    expect(titles(afterGoaStarted)).toEqual(['Kerala backwaters']);
  });
});

describe('Auto-Close (rule 3) on real Postgres', () => {
  it.each([
    ['one millisecond before the start date', '2027-02-28T23:59:59.999Z', false],
    ['exactly the start date', '2027-03-01T00:00:00.000Z', true],
    ['one millisecond after the start date', '2027-03-01T00:00:00.001Z', true],
  ])('the_sql_and_the_domain_agree_%s', async (_label, at, shouldClose) => {
    const { app, services } = startApp();
    const ravi = await signUp(app, 'Ravi');
    const { body } = await ravi.post('/api/plans', planInput());
    const now = new Date(at);

    const closed = await services.repos.plans.closeStartedBy(now);

    const stored = await prisma.travelPlan.findUnique({ where: { id: body.plan.id } });
    expect(stored.status === 'CLOSED').toBe(shouldClose);
    expect(closed).toBe(shouldClose ? 1 : 0);
    expect(hasStarted({ startDate: new Date(stored.startDate) }, now)).toBe(shouldClose);
  });

  it('does_not_touch_plans_the_host_already_closed_and_reports_zero', async () => {
    const { app, services } = startApp();
    const ravi = await signUp(app, 'Ravi');
    const { body } = await ravi.post('/api/plans', planInput());
    await prisma.travelPlan.update({ where: { id: body.plan.id }, data: { status: 'CLOSED' } });

    const closed = await services.repos.plans.closeStartedBy(new Date('2028-01-01T00:00:00.000Z'));

    expect(closed).toBe(0);
  });
});
