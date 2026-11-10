import { MAX_ACTIVITIES_PER_DAY, MAX_TRIP_DAYS } from '../../validation/itinerary.schema.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Inclusive count of Itinerary Days: a same-day trip is 1 day. Capped so a typo'd end date
// cannot ask the model for years of output.
export function tripDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new RangeError('endDate must be a valid date on or after startDate');
  }
  const days = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return Math.min(days, MAX_TRIP_DAYS);
}

const SYSTEM = [
  'You are the Itinerary Generator of a solo travel companion app.',
  'Answer with JSON only, no prose and no markdown.',
  `Shape: {"days":[{"day":1,"title":"...","activities":["..."]}]}.`,
  `Each day has a short title and 1 to ${MAX_ACTIVITIES_PER_DAY} activities.`,
].join(' ');

// Interests and destination are user text: they go in the user message as data, never in `system`.
export function buildItineraryPrompt({ destination, startDate, endDate, budget, interests }) {
  const days = tripDays(startDate, endDate);
  const lines = [
    `Destination: ${destination}`,
    `Number of days: ${days}`,
    `Budget: ${budget ?? 'not specified'}`,
    `Interests: ${interests?.length ? interests.join(', ') : 'none given'}`,
    `Return exactly ${days} days, numbered 1 to ${days} in order.`,
  ];
  return { system: SYSTEM, user: lines.join('\n') };
}
