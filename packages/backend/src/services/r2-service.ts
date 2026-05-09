// Filesystem fallback for dev - no R2 credentials needed.
// When R2_ACCOUNT_ID is set, this would use @aws-sdk/client-s3.
export function generatePresignedUrl(fileKey: string, _contentType: string, _maxSize: number) {
  // Dev mode: return filesystem upload URL
  return { url: `http://localhost:3001/uploads/${fileKey}`, fileKey };
}
