import { describe, it, expect, vi } from 'vitest';
import { authenticateSocket, handlePrivateMessage, userRoom } from '../src/sockets/index.js';
import { createMessageService } from '../src/services/message.service.js';
import { parseCookieHeader } from '../src/utils/cookies.js';
import { FriendStatus } from '../src/domain/enums.js';
import { createWorld } from './helpers/world.js';

const ASHA = '11111111-1111-4111-8111-111111111111';
const BEN = '22222222-2222-4222-8222-222222222222';

async function setup() {
  const world = createWorld();
  world.addUser({ id: ASHA, name: 'Asha' });
  world.addUser({ id: BEN, name: 'Ben' });
  await world.repos.friendships.create({
    requesterId: ASHA,
    addresseeId: BEN,
    status: FriendStatus.ACCEPTED,
  });
  const messages = createMessageService({ repos: world.repos, uow: world.uow, clock: world.clock });
  const emitTo = vi.fn();
  return { world, messages, emitTo };
}

describe('handlePrivateMessage', () => {
  it('stores_the_message_and_delivers_it_to_both_users_rooms', async () => {
    const { messages, emitTo } = await setup();

    const ack = await handlePrivateMessage({
      messages,
      emitTo,
      senderId: ASHA,
      payload: { to: BEN, body: '  Hi Ben ' },
    });

    expect(ack).toMatchObject({ ok: true, message: { body: 'Hi Ben', senderId: ASHA } });
    expect(emitTo).toHaveBeenCalledTimes(2);
    expect(emitTo).toHaveBeenCalledWith(userRoom(BEN), 'private:message', ack.message);
    expect(emitTo).toHaveBeenCalledWith(userRoom(ASHA), 'private:message', ack.message);
  });

  it.each([
    ['an empty body', { to: BEN, body: '   ' }],
    ['a body over 2000 characters', { to: BEN, body: 'x'.repeat(2001) }],
    ['a recipient that is not an id', { to: 'ben', body: 'hi' }],
    ['no payload at all', undefined],
  ])('rejects_%s_without_delivering_anything', async (_label, payload) => {
    const { messages, emitTo, world } = await setup();

    const ack = await handlePrivateMessage({ messages, emitTo, senderId: ASHA, payload });

    expect(ack).toEqual({ ok: false, error: 'Invalid message' });
    expect(emitTo).not.toHaveBeenCalled();
    expect(world.db.messages).toHaveLength(0);
  });

  it('accepts_a_body_of_exactly_2000_characters', async () => {
    const { messages, emitTo } = await setup();

    const ack = await handlePrivateMessage({
      messages,
      emitTo,
      senderId: ASHA,
      payload: { to: BEN, body: 'x'.repeat(2000) },
    });

    expect(ack.ok).toBe(true);
  });

  it('acks_the_rule_message_and_delivers_nothing_when_the_receiver_blocked_the_sender', async () => {
    const { world, messages, emitTo } = await setup();
    await world.repos.blocks.add(BEN, ASHA);

    const ack = await handlePrivateMessage({
      messages,
      emitTo,
      senderId: ASHA,
      payload: { to: BEN, body: 'hello?' },
    });

    expect(ack).toEqual({ ok: false, error: 'You cannot contact this user' });
    expect(emitTo).not.toHaveBeenCalled();
  });

  it('hides_unexpected_errors_behind_a_generic_message', async () => {
    const { emitTo } = await setup();
    const messages = { send: async () => Promise.reject(new Error('db password is hunter2')) };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ack = await handlePrivateMessage({
      messages,
      emitTo,
      senderId: ASHA,
      payload: { to: BEN, body: 'hi' },
    });

    expect(ack).toEqual({ ok: false, error: 'Something went wrong' });
  });
});

describe('authenticateSocket', () => {
  const run = async (cookie, users) => {
    const socket = { handshake: { headers: { cookie } }, data: {} };
    const next = vi.fn();
    await authenticateSocket(users)(socket, next);
    return { socket, next };
  };

  it('refuses_a_connection_without_a_session_cookie', async () => {
    const { next } = await run(undefined, { findById: async () => null });

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('refuses_a_connection_with_a_forged_token', async () => {
    const { next } = await run('stc_token=not-a-real-token', { findById: async () => null });

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});

describe('parseCookieHeader', () => {
  it('reads_several_cookies_and_decodes_values', () => {
    expect(parseCookieHeader('a=1; b=hello%20world; c=')).toEqual({
      a: '1',
      b: 'hello world',
      c: '',
    });
  });

  it('keeps_equals_signs_inside_a_value', () => {
    expect(parseCookieHeader('t=abc=def==')).toEqual({ t: 'abc=def==' });
  });

  it.each([[undefined], [''], [';;']])('returns_nothing_for_%j', (header) => {
    expect(parseCookieHeader(header)).toEqual({});
  });
});
