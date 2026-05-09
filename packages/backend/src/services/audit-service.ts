import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createAuditLog(params: {
  documentId: string;
  actorId?: string;
  actorType: 'system' | 'seller' | 'admin';
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const data: Record<string, unknown> = {
    document_id: params.documentId,
    actor_id: params.actorId || null,
    actor_type: params.actorType,
    action: params.action,
  };
  if (params.metadata) data.metadata = params.metadata;
  await prisma.auditLog.create({ data: data as any });
}
