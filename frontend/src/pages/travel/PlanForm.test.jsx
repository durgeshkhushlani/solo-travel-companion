import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanForm, { validatePlan } from './PlanForm.jsx';
import * as plansApi from '../../api/plans.js';
import * as aiApi from '../../api/ai.js';
import { renderAt } from '../../test/render.jsx';
import { makePlan } from '../../test/fixtures.js';

vi.mock('../../api/plans.js');
vi.mock('../../api/ai.js');

const base = { title: 'T', destination: 'Goa', description: '', coverUrl: '', startDate: '2030-05-01', endDate: '2030-05-03', interests: '', maxCompanions: '' };

function fillBasics({ start = '2030-05-01', end = '2030-05-03' } = {}) {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Goa Escape' } });
  fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'Goa' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: end } });
}

describe('validatePlan', () => {
  it.each([
    ['blank_title', { ...base, title: ' ' }, /title/i],
    ['blank_destination', { ...base, destination: '' }, /destination/i],
    ['missing_dates', { ...base, startDate: '' }, /dates are required/i],
    ['end_one_day_before_start', { ...base, endDate: '2030-04-30' }, /before the start/i],
    ['zero_max_companions', { ...base, maxCompanions: '0' }, /at least 1/i],
  ])('refuses_%s', (_label, form, expected) => {
    expect(validatePlan(form)).toMatch(expected);
  });

  it.each([
    ['same_start_and_end_day', { ...base, endDate: base.startDate }],
    ['one_max_companion', { ...base, maxCompanions: '1' }],
    ['no_limit', { ...base, maxCompanions: '' }],
  ])('accepts_%s', (_label, form) => {
    expect(validatePlan(form)).toBe('');
  });
});

describe('PlanForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    plansApi.createPlan.mockResolvedValue({ plan: makePlan({ id: 'new1' }) });
  });

  it('refuses_an_end_date_before_the_start_date_without_calling_the_api', async () => {
    renderAt(<PlanForm />, { path: '/plans/new' });
    fillBasics({ start: '2030-05-10', end: '2030-05-01' });

    await userEvent.click(screen.getByRole('button', { name: 'Create Travel Plan' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/before the start/i);
    expect(plansApi.createPlan).not.toHaveBeenCalled();
  });

  it('creates_the_plan_with_a_cleaned_body_and_opens_it', async () => {
    renderAt(<PlanForm />, { path: '/plans/new' });
    fillBasics();
    fireEvent.change(screen.getByLabelText('Interests'), { target: { value: 'food, ,trekking' } });
    fireEvent.change(screen.getByLabelText('Max Companions'), { target: { value: '4' } });

    await userEvent.click(screen.getByRole('button', { name: 'Create Travel Plan' }));

    await waitFor(() => expect(plansApi.createPlan).toHaveBeenCalled());
    expect(plansApi.createPlan.mock.calls[0][0]).toMatchObject({
      title: 'Goa Escape', destination: 'Goa', interests: ['food', 'trekking'], maxCompanions: 4, itinerary: [],
    });
    expect(await screen.findByText('elsewhere')).toBeInTheDocument();
  });

  it('adds_and_removes_itinerary_days_and_renumbers_them', async () => {
    renderAt(<PlanForm />, { path: '/plans/new' });

    await userEvent.click(screen.getByRole('button', { name: 'Add day' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add day' }));
    expect(screen.getByLabelText('Day 2 title')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove day 1' }));

    expect(screen.queryByLabelText('Day 2 title')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Day 1 title')).toBeInTheDocument();
  });

  it('fills_the_editor_when_generate_itinerary_succeeds', async () => {
    aiApi.generateItinerary.mockResolvedValue({
      itinerary: [
        { day: 1, title: 'Beach', activities: ['Swim'] },
        { day: 2, title: 'Fort', activities: ['Walk'] },
      ],
    });
    renderAt(<PlanForm />, { path: '/plans/new' });
    fillBasics();

    await userEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));

    expect(await screen.findByLabelText('Day 2 title')).toHaveValue('Fort');
    expect(aiApi.generateItinerary).toHaveBeenCalledWith({
      destination: 'Goa', startDate: '2030-05-01', endDate: '2030-05-03', interests: [],
    });
  });

  it.each([502, 503])('shows_a_friendly_message_and_stays_usable_on_%i', async (status) => {
    aiApi.generateItinerary.mockRejectedValue({ response: { status, data: { error: 'x' } } });
    renderAt(<PlanForm />, { path: '/plans/new' });
    fillBasics();

    await userEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/unavailable.*by hand/i);
    await userEvent.click(screen.getByRole('button', { name: 'Add day' }));
    expect(screen.getByLabelText('Day 1 title')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Generate itinerary' })).toBeEnabled();
  });

  it('asks_for_destination_and_dates_before_generating', async () => {
    renderAt(<PlanForm />, { path: '/plans/new' });

    await userEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/destination and valid dates/i);
    expect(aiApi.generateItinerary).not.toHaveBeenCalled();
  });

  it('loads_an_existing_plan_and_saves_changes_with_update', async () => {
    plansApi.getPlan.mockResolvedValue({ plan: makePlan() });
    plansApi.updatePlan.mockResolvedValue({ plan: makePlan() });
    renderAt(<PlanForm />, { path: '/plans/:id/edit', route: '/plans/p1/edit' });
    expect(await screen.findByDisplayValue('Hampi Trek')).toBeInTheDocument();
    expect(screen.getByLabelText('Day 1 title')).toHaveValue('Arrive');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(plansApi.updatePlan).toHaveBeenCalledWith('p1', expect.objectContaining({ title: 'Hampi Trek' })));
    expect(plansApi.createPlan).not.toHaveBeenCalled();
  });
});
