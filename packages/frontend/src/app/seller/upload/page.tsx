'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_SIZE = 10 * 1024 * 1024;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setUploading(true);
    setProgress(10);
    try {
      const { documentId, uploadUrl } = await apiClient<{ documentId: string; uploadUrl: string }>('/api/documents/upload-url', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      setProgress(50);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setProgress(80);
      await apiClient(`/api/documents/${documentId}/confirm-upload`, { method: 'POST' });
      setProgress(100);
      setSuccess(true);
      setTimeout(() => router.replace('/seller/dashboard'), 1500);
    } catch (err: any) { setError(err.message); setUploading(false); setProgress(0); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful</h2>
        <p className="text-slate-500">Your document is being verified. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back Link */}
      <Link href="/seller/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Upload Document</h1>
      <p className="text-slate-500 mb-8">Upload your ID document for verification. Accepted formats: PDF, PNG, JPG (max 10MB).</p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8">
        {/* File Drop Zone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 text-center transition-colors cursor-pointer">
          <input
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f && !ALLOWED_TYPES.includes(f.type)) return setError('Invalid file type. Allowed: PDF, PNG, JPG');
              if (f && f.size > MAX_SIZE) return setError('File too large. Max: 10MB');
              if (f) setFile(f);
              setError('');
            }}
            className="hidden"
            id="file-upload"
            required
            disabled={uploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-4">
              <UploadIcon className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {file ? file.name : 'Click to select a file'}
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 10MB</p>
          </label>
        </div>

        {/* Selected File Info */}
        {file && !uploading && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-slate-50 rounded-lg">
            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Uploading...</span>
              <span className="text-sm text-slate-500">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
    </div>
  );
}
