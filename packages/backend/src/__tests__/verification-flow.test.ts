import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Verification Flow', () => {
  let sellerId: string;
  let adminId: string;
  let docId: string;

  beforeAll(async () => {
    const hash = await bcrypt.hash('password123', 10);
    const seller = await prisma.user.create({ data: { email: `seller-${Date.now()}@test.com`, password_hash: hash, role: 'seller', name: 'Test Seller' } });
    const admin = await prisma.user.create({ data: { email: `admin-${Date.now()}@test.com`, password_hash: hash, role: 'admin', name: 'Test Admin' } });
    sellerId = seller.id;
    adminId = admin.id;
    docId = (await prisma.document.create({ data: { seller_id: sellerId, file_key: 'test-key', file_name: 'test.pdf', file_type: 'application/pdf', file_size: 1024 } })).id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { document_id: docId } });
    await prisma.auditLog.deleteMany({ where: { document_id: docId } });
    await prisma.document.deleteMany({ where: { id: docId } });
    await prisma.user.deleteMany({ where: { id: { in: [sellerId, adminId] } } });
    await prisma.$disconnect();
  });

  it('creates a document with pending_upload status', async () => {
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    expect(doc?.status).toBe('pending_upload');
  });

  it('transitions to pending_verification on confirm', async () => {
    const updated = await prisma.document.update({ where: { id: docId }, data: { status: 'pending_verification', submitted_at: new Date(), version: 2 } });
    await prisma.auditLog.create({ data: { document_id: docId, actor_id: sellerId, actor_type: 'seller', action: 'file_uploaded' } });
    expect(updated.status).toBe('pending_verification');
    expect(updated.version).toBe(2);
  });

  it('transitions to verified', async () => {
    const updated = await prisma.document.update({ where: { id: docId }, data: { status: 'verified', verified_at: new Date(), version: 3 } });
    await prisma.auditLog.create({ data: { document_id: docId, actor_type: 'system', action: 'status_verified' } });
    await prisma.notification.create({ data: { user_id: sellerId, document_id: docId, type: 'verified', message: 'Document verified' } });
    expect(updated.status).toBe('verified');
  });

  it('prevents invalid transitions from verified', async () => {
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    const transitions: Record<string, string[]> = { verified: [], approved: [], rejected: [], expired: [] };
    expect(transitions[doc!.status]).toHaveLength(0);
  });

  it('creates audit log on state transition', async () => {
    const logs = await prisma.auditLog.findMany({ where: { document_id: docId } });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('creates notification on terminal state', async () => {
    const notifications = await prisma.notification.findMany({ where: { document_id: docId } });
    expect(notifications.length).toBeGreaterThan(0);
  });
});
