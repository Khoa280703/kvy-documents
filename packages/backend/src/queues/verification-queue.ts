import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const verificationQueue = new Queue('verification', {
  connection,
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential' as const, delay: 60000 } },
});

const worker = new Worker('verification', async (job) => {
  const { documentId, fileKey } = job.data;
  const callbackUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/api/webhook/verification`;
  const response = await fetch(`${process.env.MOCK_SERVICE_URL || 'http://localhost:3002'}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, callbackUrl, fileKey }),
  });
  if (!response.ok) throw new Error(`Mock service returned ${response.status}`);
}, { connection });

worker.on('error', (err) => console.error('Worker error:', err.message));
worker.on('completed', (job) => console.log(`Verification job ${job?.id} completed`));
worker.on('failed', (job, err) => console.error(`Verification job ${job?.id} failed: ${err.message}`));
