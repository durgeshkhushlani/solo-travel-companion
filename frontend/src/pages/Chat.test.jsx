import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat.jsx';
import * as messagesApi from '../api/messages.js';
import { useSocket } from '../hooks/useSocket.js';
import { renderAt, alice } from '../test/render.jsx';

vi.mock('../api/messages.js');
vi.mock('../hooks/useSocket.js');

// A tiny stand-in for the socket.io client that lets a test push server events.
function fakeSocket() {
  const handlers = {};
  return {
    emit: vi.fn(),
    on: (event, fn) => { handlers[event] = fn; },
    off: (event) => { delete handlers[event]; },
    push: (event, payload) => act(() => handlers[event](payload)),
  };
}

const thread = () => screen.getByLabelText('Messages');
const bo = { id: 'u2', name: 'Bo', photoUrl: null };
const cy = { id: 'u3', name: 'Cy', photoUrl: null };
const msg = (over) => ({ id: 'm1', senderId: 'u2', receiverId: 'u1', body: 'hi', readAt: null, createdAt: '2030-01-01T00:00:00Z', ...over });

describe('Chat page', () => {
  let socket;
  beforeEach(() => {
    vi.resetAllMocks();
    socket = fakeSocket();
    useSocket.mockReturnValue(socket);
    messagesApi.listConversations.mockResolvedValue({
      items: [
        { user: bo, last: msg(), unread: 2 },
        { user: cy, last: null, unread: 0 },
      ],
    });
    messagesApi.getHistory.mockResolvedValue({ items: [msg({ body: 'earlier hello' })] });
    messagesApi.markRead.mockResolvedValue(undefined);
  });

  const show = (route = '/chat') => renderAt(<Chat />, { path: '/chat', route, user: alice });

  it('shows_an_unread_badge_only_on_conversations_with_unread_messages', async () => {
    show();
    expect(await screen.findByLabelText('2 unread')).toBeInTheDocument();
    expect(screen.queryByLabelText('0 unread')).not.toBeInTheDocument();
  });

  it('loads_history_and_clears_the_badge_when_a_conversation_is_opened', async () => {
    show();
    await userEvent.click(await screen.findByRole('button', { name: /Bo/ }));

    expect(await screen.findByText('earlier hello')).toBeInTheDocument();
    expect(messagesApi.markRead).toHaveBeenCalledWith('u2');
    await waitFor(() => expect(screen.queryByLabelText('2 unread')).not.toBeInTheDocument());
  });

  it('opens_the_friend_named_in_the_with_query_parameter', async () => {
    show('/chat?with=u3');
    await waitFor(() => expect(messagesApi.getHistory).toHaveBeenCalledWith('u3'));
  });

  it('emits_a_private_message_with_to_and_body_when_sending', async () => {
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await userEvent.type(screen.getByLabelText('Message'), 'see you there');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(socket.emit).toHaveBeenCalledWith('private:message', { to: 'u2', body: 'see you there' }, expect.any(Function));
  });

  it('shows_the_sent_message_once_the_server_acknowledges_it', async () => {
    socket.emit.mockImplementation((_e, payload, ack) =>
      ack({ ok: true, message: msg({ id: 'm9', senderId: 'u1', receiverId: 'u2', body: payload.body }) })
    );
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await userEvent.type(screen.getByLabelText('Message'), 'on my way');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('on my way')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });

  it('shows_the_error_when_the_server_rejects_the_message', async () => {
    socket.emit.mockImplementation((_e, _p, ack) => ack({ ok: false, error: 'You are blocked' }));
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await userEvent.type(screen.getByLabelText('Message'), 'hello?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You are blocked');
  });

  it('does_not_send_an_empty_message', async () => {
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await userEvent.type(screen.getByLabelText('Message'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('appends_an_incoming_message_to_the_open_conversation', async () => {
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await socket.push('private:message', msg({ id: 'm5', body: 'live one' }));

    expect(within(thread()).getByText('live one')).toBeInTheDocument();
    expect(messagesApi.markRead).toHaveBeenCalledTimes(2);
  });

  it('does_not_show_the_same_message_twice', async () => {
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await socket.push('private:message', msg({ id: 'm5', body: 'once' }));
    await socket.push('private:message', msg({ id: 'm5', body: 'once' }));

    expect(within(thread()).getAllByText('once')).toHaveLength(1);
  });

  it('raises_the_unread_badge_for_a_message_from_a_friend_who_is_not_open', async () => {
    show('/chat?with=u2');
    await screen.findByText('earlier hello');

    await socket.push('private:message', msg({ id: 'm6', senderId: 'u3', receiverId: 'u1', body: 'psst' }));

    expect(screen.getByLabelText('1 unread')).toBeInTheDocument();
    expect(within(thread()).queryByText('psst')).not.toBeInTheDocument();
  });
});
