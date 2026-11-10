import { describe, it, expect } from 'vitest';
import { joinButtonState } from './planActions.js';

const host = { id: 'h1', name: 'Hana' };
const visitor = { id: 'u1', role: 'USER' };
const planWith = (status) => ({ id: 'p1', status, host });

describe('joinButtonState', () => {
  it('returns_none_when_nobody_is_logged_in', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: null, myRequest: null, isCompanion: false });
    expect(state).toBe('NONE');
  });

  it('returns_host_for_the_host_of_the_plan', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: { id: 'h1' }, myRequest: null, isCompanion: false });
    expect(state).toBe('HOST');
  });

  it.each(['OPEN', 'FULL', 'CLOSED'])('returns_host_when_the_plan_is_%s', (status) => {
    const state = joinButtonState({ plan: planWith(status), user: { id: 'h1' }, myRequest: null, isCompanion: false });
    expect(state).toBe('HOST');
  });

  it('returns_join_for_a_visitor_on_an_open_plan', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: visitor, myRequest: null, isCompanion: false });
    expect(state).toBe('JOIN');
  });

  it('returns_join_again_after_a_rejected_request', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: visitor, myRequest: { status: 'REJECTED' }, isCompanion: false });
    expect(state).toBe('JOIN');
  });

  it('returns_join_again_after_a_cancelled_request', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: visitor, myRequest: { status: 'CANCELLED' }, isCompanion: false });
    expect(state).toBe('JOIN');
  });

  it('returns_cancel_when_a_request_is_pending_on_an_open_plan', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: visitor, myRequest: { status: 'PENDING' }, isCompanion: false });
    expect(state).toBe('CANCEL');
  });

  it('keeps_cancel_available_for_a_pending_request_even_if_the_plan_is_full', () => {
    const state = joinButtonState({ plan: planWith('FULL'), user: visitor, myRequest: { status: 'PENDING' }, isCompanion: false });
    expect(state).toBe('CANCEL');
  });

  it('returns_pending_without_cancel_when_the_plan_has_closed_with_a_request_waiting', () => {
    const state = joinButtonState({ plan: planWith('CLOSED'), user: visitor, myRequest: { status: 'PENDING' }, isCompanion: false });
    expect(state).toBe('PENDING');
  });

  it('returns_leave_for_a_companion_on_an_open_plan', () => {
    const state = joinButtonState({ plan: planWith('OPEN'), user: visitor, myRequest: { status: 'ACCEPTED' }, isCompanion: true });
    expect(state).toBe('LEAVE');
  });

  it('returns_leave_for_a_companion_even_when_the_plan_is_full', () => {
    const state = joinButtonState({ plan: planWith('FULL'), user: visitor, myRequest: { status: 'ACCEPTED' }, isCompanion: true });
    expect(state).toBe('LEAVE');
  });

  it('returns_full_for_a_visitor_on_a_full_plan', () => {
    const state = joinButtonState({ plan: planWith('FULL'), user: visitor, myRequest: null, isCompanion: false });
    expect(state).toBe('FULL');
  });

  it('returns_closed_for_a_visitor_on_a_closed_plan', () => {
    const state = joinButtonState({ plan: planWith('CLOSED'), user: visitor, myRequest: null, isCompanion: false });
    expect(state).toBe('CLOSED');
  });

  it('returns_closed_not_join_when_a_closed_plan_has_an_old_rejected_request', () => {
    const state = joinButtonState({ plan: planWith('CLOSED'), user: visitor, myRequest: { status: 'REJECTED' }, isCompanion: false });
    expect(state).toBe('CLOSED');
  });

  it('keeps_leave_for_a_companion_after_the_plan_has_closed', () => {
    const state = joinButtonState({ plan: planWith('CLOSED'), user: visitor, myRequest: { status: 'ACCEPTED' }, isCompanion: true });
    expect(state).toBe('LEAVE');
  });
});
