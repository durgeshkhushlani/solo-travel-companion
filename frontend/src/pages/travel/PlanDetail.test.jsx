import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanDetail from './PlanDetail.jsx';
import * as plansApi from '../../api/plans.js';
import * as requestsApi from '../../api/requests.js';
import * as aiApi from '../../api/ai.js';
import { renderAt, alice } from '../../test/render.jsx';
import { makePlan, makeRequest } from '../../test/fixtures.js';

vi.mock('../../api/plans.js');
vi.mock('../../api/requests.js');
vi.mock('../../api/ai.js');

const hostUser = { id: 'h1', name: 'Hana', role: 'USER' };
const show = (user = alice) => renderAt(<PlanDetail />, { path: '/plans/:id', route: '/plans/p1', user });

function givenPlan(plan = makePlan(), { companions = [], mine = [] } = {}) {
  plansApi.getPlan.mockResolvedValue({ plan });
  plansApi.listCompanions.mockResolvedValue({ items: companions });
  requestsApi.listMyRequests.mockResolvedValue({ items: mine });
  requestsApi.listPlanRequests.mockResolvedValue({ items: [] });
  aiApi.getPlanMatches.mockResolvedValue({ items: [] });
}

describe('PlanDetail button states', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows_the_plan_info_and_itinerary', async () => {
    givenPlan();
    show();
    expect(await screen.findByRole('heading', { name: 'Hampi Trek' })).toBeInTheDocument();
    expect(screen.getByText('Day 1: Arrive')).toBeInTheDocument();
    expect(screen.getByText(/2\/3 joined/)).toBeInTheDocument();
  });

  it('shows_join_for_a_visitor_and_sends_a_join_request_when_clicked', async () => {
    givenPlan();
    requestsApi.sendJoinRequest.mockResolvedValue({ request: makeRequest() });
    show();

    await userEvent.click(await screen.findByRole('button', { name: 'Join' }));

    expect(requestsApi.sendJoinRequest).toHaveBeenCalledWith('p1');
  });

  it('shows_request_pending_and_cancel_request_when_a_request_is_waiting', async () => {
    givenPlan(makePlan(), { mine: [makeRequest({ id: 'r7', user: { id: 'u1', name: 'Alice' } })] });
    requestsApi.cancelRequest.mockResolvedValue({});
    show();

    expect(await screen.findByText('Request pending')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel request' }));

    expect(requestsApi.cancelRequest).toHaveBeenCalledWith('r7');
  });

  it('shows_leave_trip_for_a_companion_and_calls_the_api', async () => {
    givenPlan(makePlan(), { companions: [{ id: 'u1', name: 'Alice' }] });
    plansApi.leaveTrip.mockResolvedValue(undefined);
    show();

    await userEvent.click(await screen.findByRole('button', { name: 'Leave Trip' }));

    expect(plansApi.leaveTrip).toHaveBeenCalledWith('p1');
  });

  it('shows_plan_is_full_and_no_join_button_on_a_full_plan', async () => {
    givenPlan(makePlan({ status: 'FULL', acceptedCount: 3, spotsLeft: 0 }));
    show();
    expect(await screen.findByText('Plan is full')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
  });

  it('shows_plan_has_started_on_a_closed_plan', async () => {
    givenPlan(makePlan({ status: 'CLOSED' }));
    show();
    expect(await screen.findByText('Plan has started')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
  });

  it('shows_no_join_controls_to_a_logged_out_visitor', async () => {
    givenPlan();
    show(null);
    await screen.findByRole('heading', { name: 'Hampi Trek' });
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
    expect(requestsApi.listMyRequests).not.toHaveBeenCalled();
  });

  it('shows_the_server_error_when_joining_fails', async () => {
    givenPlan();
    requestsApi.sendJoinRequest.mockRejectedValue({ response: { data: { error: 'You are blocked' } } });
    show();

    await userEvent.click(await screen.findByRole('button', { name: 'Join' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You are blocked');
  });
});

describe('PlanDetail for the Host', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    givenPlan(makePlan(), { companions: [{ id: 'u3', name: 'Cy' }] });
    requestsApi.listPlanRequests.mockResolvedValue({ items: [makeRequest({ id: 'r1' })] });
  });

  it('shows_accept_and_reject_and_calls_accept_when_clicked', async () => {
    requestsApi.acceptRequest.mockResolvedValue({});
    show(hostUser);

    await userEvent.click(await screen.findByRole('button', { name: 'Accept Bo' }));

    expect(requestsApi.acceptRequest).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('button', { name: 'Reject Bo' })).toBeInTheDocument();
  });

  it('calls_reject_for_the_chosen_join_request', async () => {
    requestsApi.rejectRequest.mockResolvedValue({});
    show(hostUser);

    await userEvent.click(await screen.findByRole('button', { name: 'Reject Bo' }));

    expect(requestsApi.rejectRequest).toHaveBeenCalledWith('r1');
  });

  it('does_not_offer_accept_for_a_request_that_is_already_decided', async () => {
    requestsApi.listPlanRequests.mockResolvedValue({ items: [makeRequest({ status: 'REJECTED' })] });
    show(hostUser);
    await screen.findByText('REJECTED');
    expect(screen.queryByRole('button', { name: 'Accept Bo' })).not.toBeInTheDocument();
  });

  it('lets_the_host_remove_a_companion', async () => {
    plansApi.removeCompanion.mockResolvedValue(undefined);
    show(hostUser);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Cy' }));

    expect(plansApi.removeCompanion).toHaveBeenCalledWith('p1', 'u3');
  });

  it('shows_edit_and_delete_and_deletes_the_plan', async () => {
    plansApi.deletePlan.mockResolvedValue(undefined);
    show(hostUser);
    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/plans/p1/edit');

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(plansApi.deletePlan).toHaveBeenCalledWith('p1'));
  });

  it('does_not_show_join_or_leave_to_the_host', async () => {
    show(hostUser);
    await screen.findByText('Join Requests');
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave Trip' })).not.toBeInTheDocument();
  });

  it('shows_best_matches_when_the_ai_returns_travelers', async () => {
    aiApi.getPlanMatches.mockResolvedValue({ items: [{ user: { id: 'u9', name: 'Dee' }, score: 0.8, reason: 'Loves trekking' }] });
    show(hostUser);
    expect(await screen.findByText('Best matches')).toBeInTheDocument();
    expect(screen.getByText(/Loves trekking/)).toBeInTheDocument();
  });

  it('hides_best_matches_when_the_call_fails', async () => {
    aiApi.getPlanMatches.mockRejectedValue({ response: { status: 503 } });
    show(hostUser);
    await screen.findByText('Join Requests');
    await waitFor(() => expect(aiApi.getPlanMatches).toHaveBeenCalled());
    expect(screen.queryByText('Best matches')).not.toBeInTheDocument();
  });

  it('does_not_ask_a_non_host_for_join_requests_or_matches', async () => {
    show(alice);
    await screen.findByRole('heading', { name: 'Hampi Trek' });
    expect(requestsApi.listPlanRequests).not.toHaveBeenCalled();
    expect(aiApi.getPlanMatches).not.toHaveBeenCalled();
  });
});
