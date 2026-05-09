import { Server } from 'socket.io';
import prisma from './prisma-client';

let io: Server | null = null;

export function setIo(socketIo: Server) {
  io = socketIo;
}

export async function createNotification(params: {
  userId: string;
  documentId: string;
  type: string;
  message: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      user_id: params.userId,
      document_id: params.documentId,
      type: params.type,
      message: params.message,
    },
  });
  io?.to(`user:${params.userId}`).emit('notification', notification);
  return notification;
}
