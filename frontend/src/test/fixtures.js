// Small builders so each test only states the fields it cares about.
export const makePlan = (overrides = {}) => ({
  id: 'p1',
  title: 'Hampi Trek',
  destination: 'Hampi',
  description: 'Boulders and sunrise',
  coverUrl: null,
  startDate: '2030-03-05T00:00:00.000Z',
  endDate: '2030-03-09T00:00:00.000Z',
  interests: ['trekking'],
  maxCompanions: 3,
  acceptedCount: 2,
  spotsLeft: 1,
  status: 'OPEN',
  itinerary: [{ day: 1, title: 'Arrive', activities: ['Check in'] }],
  host: { id: 'h1', name: 'Hana', photoUrl: null },
  createdAt: '2030-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeRequest = (overrides = {}) => ({
  id: 'r1',
  status: 'PENDING',
  createdAt: '2030-01-02T00:00:00.000Z',
  user: { id: 'u2', name: 'Bo', photoUrl: null },
  plan: { id: 'p1', title: 'Hampi Trek', startDate: '2030-03-05T00:00:00.000Z' },
  ...overrides,
});
