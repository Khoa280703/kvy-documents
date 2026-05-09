import { DocumentStatus, UserRole, ActorType } from './enums';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  seller_id: string;
  file_key: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  version: number;
  reviewed_by: string | null;
  review_reason: string | null;
  rejection_reason: string | null;
  submitted_at: Date | null;
  verified_at: Date | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  document_id: string;
  actor_id: string | null;
  actor_type: ActorType;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  document_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}
