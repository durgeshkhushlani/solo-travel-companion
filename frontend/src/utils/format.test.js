import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, spotsLeftText, toDateInput } from './format.js';

describe('formatDate', () => {
  it.each([
    ['2026-03-05T00:00:00.000Z', '5 Mar 2026'],
    ['2026-12-31', '31 Dec 2026'],
    ['2027-01-01T23:59:59.000Z', '1 Jan 2027'],
  ])('formats_%s_as_%s', (iso, expected) => {
    expect(formatDate(iso)).toBe(expected);
  });
});

describe('formatDateRange', () => {
  it.each([
    ['2026-03-05', '2026-03-05', '5 Mar 2026'],
    ['2026-03-05', '2026-03-09', '5-9 Mar 2026'],
    ['2026-03-28', '2026-04-02', '28 Mar 2026 - 2 Apr 2026'],
    ['2026-12-30', '2027-01-03', '30 Dec 2026 - 3 Jan 2027'],
  ])('formats_%s_to_%s_as_%s', (start, end, expected) => {
    expect(formatDateRange(start, end)).toBe(expected);
  });
});

describe('spotsLeftText', () => {
  it.each([
    [{ maxCompanions: 3, acceptedCount: 2 }, '2/3 joined'],
    [{ maxCompanions: 3, acceptedCount: 0 }, '0/3 joined'],
    [{ maxCompanions: 1, acceptedCount: 1 }, '1/1 joined'],
    [{ maxCompanions: null, acceptedCount: 4 }, 'Open'],
  ])('shows_%j_as_%s', (plan, expected) => {
    expect(spotsLeftText(plan)).toBe(expected);
  });
});

describe('toDateInput', () => {
  it.each([
    ['2026-03-05T00:00:00.000Z', '2026-03-05'],
    ['', ''],
    [null, ''],
  ])('converts_%s_to_%s', (iso, expected) => {
    expect(toDateInput(iso)).toBe(expected);
  });
});
