import { UserRole } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface UploadUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  documentId: string;
  uploadUrl: string;
}
