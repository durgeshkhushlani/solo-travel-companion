import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDatabase, signUp, startServer } from './harness.js';

afterAll(() => prisma.$disconnect());
beforeEach(resetDatabase);

let server;
afterEach(() => server?.close());

const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const connected = (socket) => once(socket, 'connect');
const emitWithAck = (socket, event, payload) =>
  new Promise((resolve) => socket.emit(event, payload, resolve));

async function friends() {
  server = await startServer();
  const asha = await signUp(server.app, 'Asha');
  const ben = await signUp(server.app, 'Ben');
  const sent = await asha.post('/api/friends/requests', { userId: ben.id });
  await ben.post(`/api/friends/requests/${sent.body.friendshipId}/accept`);
  return { asha, ben };
}

describe('Private Chat over live sockets and real Postgres', () => {
  it('delivers_a_message_to_the_friend_and_echoes_it_to_the_sender', async () => {
    const { asha, ben } = await friends();
    const ashaSocket = server.connect(asha.cookie);
    const benSocket = server.connect(ben.cookie);
    await Promise.all([connected(ashaSocket), connected(benSocket)]);
    const atBen = once(benSocket, 'private:message');
    const atAsha = once(ashaSocket, 'private:message');

    const ack = await emitWithAck(ashaSocket, 'private:message', { to: ben.id, body: 'Hi Ben' });

    expect(ack).toMatchObject({ ok: true, message: { body: 'Hi Ben' } });
    expect(await atBen).toMatchObject({ senderId: asha.id, receiverId: ben.id, body: 'Hi Ben' });
    expect((await atAsha).id).toBe(ack.message.id);
    expect(await prisma.message.count()).toBe(1);
  });

  it('refuses_to_connect_without_a_session_cookie', async () => {
    server = await startServer();

    const socket = server.connect();
    const error = await once(socket, 'connect_error');

    expect(error.message).toBe('Not authenticated');
  });

  it('refuses_to_connect_once_the_account_is_deactivated', async () => {
    const { asha } = await friends();
    await prisma.user.update({ where: { id: asha.id }, data: { active: false } });

    const error = await once(server.connect(asha.cookie), 'connect_error');

    expect(error.message).toBe('Not authenticated');
  });

  it('acks_an_error_and_stores_nothing_for_strangers', async () => {
    server = await startServer();
    const asha = await signUp(server.app, 'Asha');
    const ben = await signUp(server.app, 'Ben');
    const socket = server.connect(asha.cookie);
    await connected(socket);

    const ack = await emitWithAck(socket, 'private:message', { to: ben.id, body: 'Hi' });

    expect(ack).toEqual({ ok: false, error: 'Private Chat is only for Friends' });
    expect(await prisma.message.count()).toBe(0);
  });

  it('acks_an_error_when_the_receiver_has_blocked_the_sender_(rule_4)', async () => {
    const { asha, ben } = await friends();
    await ben.post('/api/friends/blocks', { userId: asha.id });
    const socket = server.connect(asha.cookie);
    await connected(socket);

    const ack = await emitWithAck(socket, 'private:message', { to: ben.id, body: 'Hi' });

    expect(ack).toEqual({ ok: false, error: 'You cannot contact this user' });
  });

  it('does_not_deliver_a_message_to_a_third_user', async () => {
    const { asha, ben } = await friends();
    const cara = await signUp(server.app, 'Cara');
    const ashaSocket = server.connect(asha.cookie);
    const caraSocket = server.connect(cara.cookie);
    await Promise.all([connected(ashaSocket), connected(caraSocket)]);
    let caraHeard = false;
    caraSocket.on('private:message', () => (caraHeard = true));

    await emitWithAck(ashaSocket, 'private:message', { to: ben.id, body: 'private' });
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(caraHeard).toBe(false);
  });
});

describe('Chat history over REST', () => {
  it('shows_conversations_with_the_unread_badge_and_clears_it_when_read', async () => {
    const { asha, ben } = await friends();
    const ashaSocket = server.connect(asha.cookie);
    await connected(ashaSocket);
    await emitWithAck(ashaSocket, 'private:message', { to: ben.id, body: 'one' });
    await emitWithAck(ashaSocket, 'private:message', { to: ben.id, body: 'two' });

    const before = await ben.get('/api/messages/conversations');
    const history = await ben.get(`/api/messages/${asha.id}`);
    const read = await ben.post(`/api/messages/${asha.id}/read`);
    const after = await ben.get('/api/messages/conversations');

    expect(before.body.items[0]).toMatchObject({
      user: { name: 'Asha' },
      unread: 2,
      last: { body: 'two' },
    });
    expect(history.body.items.map((m) => m.body)).toEqual(['one', 'two']);
    expect(read.status).toBe(204);
    expect(after.body.items[0].unread).toBe(0);
  });

  it('refuses_history_with_someone_who_is_not_a_friend', async () => {
    server = await startServer();
    const asha = await signUp(server.app, 'Asha');
    const ben = await signUp(server.app, 'Ben');

    const res = await asha.get(`/api/messages/${ben.id}`);

    expect(res.status).toBe(403);
  });
});
