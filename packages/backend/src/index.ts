import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { authRoutes } from './routes/auth-routes';
import { documentRoutes } from './routes/document-routes';
import { webhookRoutes } from './routes/webhook-routes';
import { adminRoutes } from './routes/admin-routes';
import { notificationRoutes } from './routes/notification-routes';
import { errorHandler } from './middleware/error-handler';
import { setupSocket } from './socket/socket-setup';
import { setIo } from './services/notification-service';
import prisma from './services/prisma-client';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

const httpServer = createServer(app);
const io = setupSocket(httpServer);
setIo(io);

httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  io.close();
  httpServer.close(() => process.exit(0));
});
