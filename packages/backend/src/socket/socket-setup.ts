import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { verifyToken } from '../utils/jwt-utils';
import { handleConnection } from './socket-events';

export function setupSocket(httpServer: any) {
  const pubClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
  const subClient = pubClient.duplicate();

  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true },
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie || '';
      const tokenMatch = cookie.match(/token=([^;]+)/);
      if (!tokenMatch) throw new Error('No token');
      const user = verifyToken(tokenMatch[1]);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => handleConnection(socket as any));
  return io;
}
