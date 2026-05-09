'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_SIZE = 10 * 1024 * 1024;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setUploading(true);
    setProgress(10);
    try {
      const { documentId, uploadUrl } = await apiClient<{ documentId: string; uploadUrl: string }>('/api/documents/upload-url', { method: 'POST', body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }) });
      setProgress(50);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setProgress(80);
      await apiClient(`/api/documents/${documentId}/confirm-upload`, { method: 'POST' });
      setProgress(100);
      router.replace('/seller/dashboard');
    } catch (err: any) { setError(err.message); setUploading(false); setProgress(0); }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Upload Document</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={e => {
          const f = e.target.files?.[0];
          if (f && !ALLOWED_TYPES.includes(f.type)) return setError('Invalid file type. Allowed: PDF, PNG, JPG');
          if (f && f.size > MAX_SIZE) return setError('File too large. Max: 10MB');
          if (f) setFile(f);
          setError('');
        }} className="mb-4 block w-full" required disabled={uploading} />
        {progress > 0 && <div className="mb-4 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div></div>}
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
      </form>
    </div>
  );
}
