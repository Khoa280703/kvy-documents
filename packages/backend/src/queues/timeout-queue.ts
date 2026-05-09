import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { transitionState } from '../services/verification-service';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

export const timeoutQueue = new Queue('timeout', { connection });

const worker = new Worker('timeout', async (job) => {
  const { documentId } = job.data;
  try {
    await transitionState(documentId, 'expired', { actorType: 'system', reason: 'Verification timed out after 24h' });
  } catch (err: any) {
    if (err.statusCode !== 400) console.error('Timeout job error:', err.message);
  }
}, { connection });

worker.on('error', (err) => console.error('Timeout worker error:', err.message));
