import { Server } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/env.js';
import { COOKIE_NAME, verifySessionToken } from '../middleware/auth.js';
import { MAX_MESSAGE_LENGTH } from '../domain/chat.js';
import { parseCookieHeader } from '../utils/cookies.js';

const outgoingSchema = z.object({
  to: z.string().uuid(),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const userRoom = (id) => `user:${id}`;

// Handles one `private:message` event and returns the ack the client receives. Kept apart
// from socket.io so the rules can be tested without a connection.
export async function handlePrivateMessage({ messages, emitTo, senderId, payload }) {
  const parsed = outgoingSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Invalid message' };
  try {
    const message = await messages.send(senderId, parsed.data.to, parsed.data.body);
    emitTo(userRoom(message.receiverId), 'private:message', message);
    emitTo(userRoom(message.senderId), 'private:message', message);
    return { ok: true, message };
  } catch (err) {
    if (err.expose) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Something went wrong' };
  }
}

// A connection is accepted only with the Session cookie of an active User.
export function authenticateSocket(users) {
  return async (socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const session = cookies[COOKIE_NAME] && verifySessionToken(cookies[COOKIE_NAME]);
    if (!session) return next(new Error('Not authenticated'));
    const user = await users.findById(session.id);
    if (!user || !user.active) return next(new Error('Not authenticated'));
    socket.data.userId = user.id;
    next();
  };
}

export function initSockets(httpServer, { messages, users }) {
  const io = new Server(httpServer, { cors: { origin: env.clientOrigin, credentials: true } });
  io.use(authenticateSocket(users));

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId));
    socket.on('private:message', async (payload, ack) => {
      const result = await handlePrivateMessage({
        messages,
        emitTo: (room, event, data) => io.to(room).emit(event, data),
        senderId: socket.data.userId,
        payload,
      });
      if (typeof ack === 'function') ack(result);
    });
  });

  return io;
}
