export interface VerificationRequest {
  documentId: string;
  callbackUrl: string;
  fileKey: string;
}

export interface VerificationCallback {
  documentId: string;
  status: 'verified' | 'rejected' | 'inconclusive';
  reason?: string;
}
