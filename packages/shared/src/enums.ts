export enum DocumentStatus {
  PendingUpload = 'pending_upload',
  PendingVerification = 'pending_verification',
  Verified = 'verified',
  Rejected = 'rejected',
  Inconclusive = 'inconclusive',
  PendingReview = 'pending_review',
  Approved = 'approved',
  Expired = 'expired',
}

export enum UserRole {
  Seller = 'seller',
  Admin = 'admin',
}

export enum ActorType {
  System = 'system',
  Seller = 'seller',
  Admin = 'admin',
}
