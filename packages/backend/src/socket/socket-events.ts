import { Socket } from 'socket.io';

export function handleConnection(socket: Socket & { data: { user: { userId: string; role: string; name: string } } }) {
  const { userId, role } = socket.data.user;
  socket.join(`user:${userId}`);

  if (role === 'admin') {
    socket.on('review:join', ({ documentId }: { documentId: string }) => {
      socket.join(`review:${documentId}`);
      socket.to(`review:${documentId}`).emit('review:presence', { adminName: socket.data.user.name, action: 'joined' });
    });
    socket.on('review:leave', ({ documentId }: { documentId: string }) => {
      socket.leave(`review:${documentId}`);
      socket.to(`review:${documentId}`).emit('review:presence', { adminName: socket.data.user.name, action: 'left' });
    });
  }
}
