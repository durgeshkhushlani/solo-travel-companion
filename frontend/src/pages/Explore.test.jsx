import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Explore, { buildParams } from './Explore.jsx';
import * as plansApi from '../api/plans.js';
import * as aiApi from '../api/ai.js';
import { renderAt } from '../test/render.jsx';
import { makePlan } from '../test/fixtures.js';

vi.mock('../api/plans.js');
vi.mock('../api/ai.js');

const lastCallParams = () => plansApi.listPlans.mock.calls.at(-1)[0];

describe('buildParams', () => {
  it('omits_filters_that_are_empty', () => {
    const params = buildParams({ q: '  ', interest: '', from: '', to: '', openOnly: false }, 1);
    expect(params).toEqual({ page: 1, pageSize: 9 });
  });

  it('cleans_the_interest_list_and_sends_open_only', () => {
    const params = buildParams({ q: 'goa', interest: ' food , ,trekking', from: '2030-01-01', to: '', openOnly: true }, 2);
    expect(params).toEqual({ page: 2, pageSize: 9, q: 'goa', interest: 'food,trekking', from: '2030-01-01', openOnly: true });
  });
});

describe('Explore page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    plansApi.listPlans.mockResolvedValue({ items: [makePlan()], total: 1, page: 1, pageSize: 9 });
    aiApi.getRecommendations.mockResolvedValue({ items: [] });
  });

  it('shows_plan_cards_with_spots_left_and_plan_status', async () => {
    renderAt(<Explore />);
    expect(await screen.findByText('Hampi Trek')).toBeInTheDocument();
    expect(screen.getByText('2/3 joined')).toBeInTheDocument();
    expect(screen.getByText('Open', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows_open_instead_of_a_count_when_the_plan_has_no_limit', async () => {
    plansApi.listPlans.mockResolvedValue({ items: [makePlan({ maxCompanions: null })], total: 1 });
    renderAt(<Explore />);
    await screen.findByText('Hampi Trek');
    expect(screen.queryByText(/joined/)).not.toBeInTheDocument();
  });

  it('sends_the_typed_filters_to_the_api_when_searching', async () => {
    renderAt(<Explore />);
    await screen.findByText('Hampi Trek');

    await userEvent.type(screen.getByLabelText('Search'), 'hampi');
    await userEvent.type(screen.getByLabelText('Interests'), 'food, trekking');
    await userEvent.click(screen.getByLabelText('Open only'));
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(lastCallParams()).toEqual({ page: 1, pageSize: 9, q: 'hampi', interest: 'food,trekking', openOnly: true })
    );
  });

  it('goes_to_the_next_page_and_back', async () => {
    plansApi.listPlans.mockResolvedValue({ items: [makePlan()], total: 20 });
    renderAt(<Explore />);
    await screen.findByText('Page 1 of 3');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(lastCallParams().page).toBe(2));

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(lastCallParams().page).toBe(1));
  });

  it('disables_previous_on_the_first_page_and_next_on_the_last', async () => {
    renderAt(<Explore />);
    await screen.findByText('Page 1 of 1');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('shows_the_recommended_for_you_strip_when_the_ai_returns_plans', async () => {
    aiApi.getRecommendations.mockResolvedValue({
      items: [{ plan: makePlan({ id: 'p9', title: 'Goa Beaches' }), score: 0.9, reason: 'Matches your food interest' }],
    });
    renderAt(<Explore />);
    expect(await screen.findByText('Recommended for You')).toBeInTheDocument();
    expect(screen.getByText('Goa Beaches')).toBeInTheDocument();
    expect(screen.getByText('Matches your food interest')).toBeInTheDocument();
  });

  it('hides_the_recommended_for_you_strip_when_the_call_fails', async () => {
    aiApi.getRecommendations.mockRejectedValue({ response: { status: 503 } });
    renderAt(<Explore />);
    await screen.findByText('Hampi Trek');
    await waitFor(() => expect(aiApi.getRecommendations).toHaveBeenCalled());
    expect(screen.queryByText('Recommended for You')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does_not_ask_for_recommendations_when_logged_out', async () => {
    renderAt(<Explore />, { user: null });
    await screen.findByText('Hampi Trek');
    expect(aiApi.getRecommendations).not.toHaveBeenCalled();
  });

  it('shows_the_server_error_when_the_feed_fails', async () => {
    plansApi.listPlans.mockRejectedValue({ response: { data: { error: 'Database down' } } });
    renderAt(<Explore />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Database down');
  });
});
