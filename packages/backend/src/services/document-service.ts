import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@kvy/shared';
import { AppError } from '../utils/app-error';
import prisma from './prisma-client';

export async function createDocument(params: {
  sellerId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  if (!ALLOWED_FILE_TYPES.includes(params.fileType))
    throw new AppError(400, 'Invalid file type');
  if (params.fileSize > MAX_FILE_SIZE)
    throw new AppError(400, 'File too large');

  const active = await prisma.document.findFirst({
    where: {
      seller_id: params.sellerId,
      status: { in: ['pending_verification', 'pending_upload'] },
    },
  });
  if (active) throw new AppError(400, 'Active verification in progress');

  const fileKey = `documents/${Date.now()}-${params.fileName.replace(/\s/g, '_')}`;
  const doc = await prisma.document.create({
    data: {
      seller_id: params.sellerId,
      file_key: fileKey,
      file_name: params.fileName,
      file_type: params.fileType,
      file_size: params.fileSize,
    },
  });

  await prisma.auditLog.create({
    data: {
      document_id: doc.id,
      actor_id: params.sellerId,
      actor_type: 'seller',
      action: 'document_created',
      metadata: { file_name: params.fileName } as any,
    },
  });

  return doc;
}

export async function confirmUpload(documentId: string, sellerId: string) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError(404, 'Document not found');
    if (doc.seller_id !== sellerId) throw new AppError(403, 'Forbidden');
    if (doc.status !== 'pending_upload') throw new AppError(400, 'Invalid document status');

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { status: 'pending_verification', submitted_at: new Date(), version: doc.version + 1 },
    });

    await tx.auditLog.create({
      data: {
        document_id: documentId,
        actor_id: sellerId,
        actor_type: 'seller',
        action: 'file_uploaded',
      },
    });

    return updated;
  });
}

export async function listDocuments(sellerId: string, role: string) {
  if (role === 'admin') return prisma.document.findMany({ orderBy: { created_at: 'desc' }, include: { seller: { select: { name: true, email: true } } } });
  return prisma.document.findMany({ where: { seller_id: sellerId }, orderBy: { created_at: 'desc' } });
}

export async function getDocument(documentId: string, sellerId: string, role: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { seller: { select: { name: true, email: true } } },
  });
  if (!doc) throw new AppError(404, 'Document not found');
  if (role !== 'admin' && doc.seller_id !== sellerId) throw new AppError(403, 'Forbidden');
  return doc;
}
