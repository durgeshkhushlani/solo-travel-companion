import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Friends from './Friends.jsx';
import * as friendsApi from '../api/friends.js';
import { renderAt } from '../test/render.jsx';

vi.mock('../api/friends.js');

describe('Friends page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    friendsApi.listFriends.mockResolvedValue({ items: [{ friendshipId: 'f1', user: { id: 'u2', name: 'Bo' } }] });
    friendsApi.listFriendRequests.mockResolvedValue({ items: [{ friendshipId: 'f2', user: { id: 'u3', name: 'Cy' } }] });
    friendsApi.listBlocks.mockResolvedValue({ items: [{ id: 'u4', name: 'Di' }] });
  });

  it('lists_friends_friend_requests_and_blocked_users', async () => {
    renderAt(<Friends />);
    expect(await screen.findByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();
    expect(screen.getByText('Di')).toBeInTheDocument();
  });

  it('accepts_a_friend_request_by_its_friendship_id', async () => {
    friendsApi.acceptFriendRequest.mockResolvedValue({ friendshipId: 'f2' });
    renderAt(<Friends />);

    await userEvent.click(await screen.findByRole('button', { name: 'Accept Cy' }));

    expect(friendsApi.acceptFriendRequest).toHaveBeenCalledWith('f2');
  });

  it('unfriends_by_user_id', async () => {
    friendsApi.unfriend.mockResolvedValue(undefined);
    renderAt(<Friends />);

    await userEvent.click(await screen.findByRole('button', { name: 'Unfriend Bo' }));

    expect(friendsApi.unfriend).toHaveBeenCalledWith('u2');
  });

  it('unblocks_a_blocked_user', async () => {
    friendsApi.unblockUser.mockResolvedValue(undefined);
    renderAt(<Friends />);

    await userEvent.click(await screen.findByRole('button', { name: 'Unblock Di' }));

    expect(friendsApi.unblockUser).toHaveBeenCalledWith('u4');
  });

  it('shows_empty_messages_when_there_is_nothing_to_list', async () => {
    friendsApi.listFriends.mockResolvedValue({ items: [] });
    friendsApi.listFriendRequests.mockResolvedValue({ items: [] });
    friendsApi.listBlocks.mockResolvedValue({ items: [] });
    renderAt(<Friends />);
    expect(await screen.findByText('You have no Friends yet.')).toBeInTheDocument();
    expect(screen.getByText('No Friend Requests.')).toBeInTheDocument();
  });
});
