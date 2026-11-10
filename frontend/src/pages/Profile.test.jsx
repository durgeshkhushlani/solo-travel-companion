import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from './Profile.jsx';
import * as usersApi from '../api/users.js';
import * as friendsApi from '../api/friends.js';
import { renderAt, alice } from '../test/render.jsx';

vi.mock('../api/users.js');
vi.mock('../api/friends.js');

const bo = { id: 'u2', name: 'Bo', bio: 'Hiker', interests: ['trekking'], travelStyle: 'budget' };
const show = (profile) => {
  usersApi.getUser.mockResolvedValue({ user: profile });
  return renderAt(<Profile />, { path: '/profile/:id', route: `/profile/${profile.id}` });
};

describe('Profile page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    friendsApi.listFriends.mockResolvedValue({ items: [] });
    friendsApi.listBlocks.mockResolvedValue({ items: [] });
  });

  it('shows_another_users_profile_with_friend_and_block_buttons', async () => {
    show(bo);
    expect(await screen.findByRole('heading', { name: 'Bo' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Add Friend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Block' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();
  });

  it('sends_a_friend_request_and_shows_it_as_sent', async () => {
    friendsApi.sendFriendRequest.mockResolvedValue({ friendshipId: 'f1' });
    show(bo);

    await userEvent.click(await screen.findByRole('button', { name: 'Add Friend' }));

    expect(friendsApi.sendFriendRequest).toHaveBeenCalledWith('u2');
    expect(await screen.findByText('Friend Request sent')).toBeInTheDocument();
  });

  it('blocks_the_user_and_offers_unblock', async () => {
    friendsApi.blockUser.mockResolvedValue(undefined);
    show(bo);

    await userEvent.click(await screen.findByRole('button', { name: 'Block' }));

    expect(friendsApi.blockUser).toHaveBeenCalledWith('u2');
    expect(await screen.findByRole('button', { name: 'Unblock' })).toBeInTheDocument();
  });

  it('shows_unfriend_when_already_friends', async () => {
    friendsApi.listFriends.mockResolvedValue({ items: [{ friendshipId: 'f1', user: { id: 'u2', name: 'Bo' } }] });
    show(bo);
    expect(await screen.findByRole('button', { name: 'Unfriend' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Friend' })).not.toBeInTheDocument();
  });

  it('lets_the_user_edit_their_own_profile_and_saves_with_split_interests', async () => {
    usersApi.updateMe.mockResolvedValue({ user: { ...alice, name: 'Alice B', interests: ['food', 'art'] } });
    show({ ...alice, bio: '', travelStyle: null, photoUrl: null });

    await userEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    const interests = screen.getByLabelText('Interests');
    await userEvent.type(interests, 'food, art');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(usersApi.updateMe).toHaveBeenCalledWith(expect.objectContaining({ interests: ['food', 'art'] }));
    expect(await screen.findByRole('heading', { name: 'Alice B' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Friend' })).not.toBeInTheDocument();
  });
});
