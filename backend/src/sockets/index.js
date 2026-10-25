import { Server } from 'socket.io';
import { env } from '../config/env.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientOrigin, credentials: true } });

  io.on('connection', (socket) => {
    // TODO: authenticate from cookie, join room `user:<id>`
    socket.on('private:message', () => {});
    socket.on('community:message', () => {});
    socket.on('disconnect', () => {}); // TODO: presence
  });

  return io;
}
