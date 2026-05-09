import express from 'express';

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-webhook-secret';

const reasons: Record<string, string[]> = {
  verified: ['Document matches official records', 'All details verified successfully'],
  rejected: ['Document appears altered', 'Information does not match records', 'Document expired'],
  inconclusive: ['Image quality too low for verification', 'Partial match - manual review required', 'Inconsistent information detected'],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

app.post('/verify', async (req, res) => {
  const { documentId, callbackUrl } = req.body;
  if (!documentId || !callbackUrl) return res.status(400).json({ error: 'Missing required fields' });
  res.status(202).json({ status: 'processing' });

  const delay = 2000 + Math.random() * 8000;
  setTimeout(async () => {
    const r = Math.random();
    const status = r < 0.4 ? 'verified' : r < 0.7 ? 'rejected' : 'inconclusive';
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': WEBHOOK_SECRET },
        body: JSON.stringify({ documentId, status, reason: pickRandom(reasons[status]) }),
      });
    } catch (err) {
      console.error('Webhook callback failed:', err);
    }
  }, delay);
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.MOCK_SERVICE_PORT || 3002;
app.listen(PORT, () => console.log(`Mock service running on port ${PORT}`));
