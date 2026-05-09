import { AppError } from '../utils/app-error';
import { createAuditLog } from './audit-service';
import { createNotification } from './notification-service';
import prisma from './prisma-client';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_upload: ['pending_verification'],
  pending_verification: ['verified', 'rejected', 'inconclusive', 'expired'],
  inconclusive: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  verified: [],
  approved: [],
  rejected: [],
  expired: [],
};

const TERMINAL_STATES = ['verified', 'approved', 'rejected', 'expired'];

export async function transitionState(
  documentId: string,
  newStatus: string,
  params: { actorId?: string; actorType: 'system' | 'seller' | 'admin'; reason?: string; expectedVersion?: number },
): Promise<any> {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError(404, 'Document not found');

    if (!VALID_TRANSITIONS[doc.status]?.includes(newStatus))
      throw new AppError(400, `Invalid transition: ${doc.status} -> ${newStatus}`);

    if (params.expectedVersion !== undefined && doc.version !== params.expectedVersion)
      throw new AppError(409, 'Version conflict');

    const update: any = { status: newStatus, version: doc.version + 1 };
    if (params.reason) update.review_reason = params.reason;
    if (newStatus === 'verified') update.verified_at = new Date();
    if (['approved', 'rejected'].includes(newStatus)) {
      update.reviewed_at = new Date();
      if (params.actorId) update.reviewed_by = params.actorId;
    }

    const updated = await tx.document.update({ where: { id: documentId }, data: update });

    await tx.auditLog.create({
      data: {
        document_id: documentId,
        actor_id: params.actorId,
        actor_type: params.actorType,
        action: `status_${newStatus}`,
        metadata: { from: doc.status, to: newStatus, reason: params.reason } as any,
      },
    });

    return { updated, doc };
  });
}

export async function postTransitionEffects(updated: any, previousStatus: string, newStatus: string, actorId?: string): Promise<void> {
  // Auto-transition inconclusive -> pending_review
  if (newStatus === 'inconclusive') {
    await transitionState(updated.id, 'pending_review', {
      actorType: 'system',
      reason: 'Auto-transited from inconclusive',
      expectedVersion: updated.version,
    });
    return;
  }

  // Notify seller on terminal states
  if (TERMINAL_STATES.includes(newStatus)) {
    await createNotification({
      userId: updated.seller_id,
      documentId: updated.id,
      type: newStatus,
      message: `Your document has been ${newStatus}`,
    });
  }

  // Notify admins on pending_review
  if (newStatus === 'pending_review') {
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        documentId: updated.id,
        type: 'pending_review',
        message: 'A document requires your review',
      });
    }
  }
}
