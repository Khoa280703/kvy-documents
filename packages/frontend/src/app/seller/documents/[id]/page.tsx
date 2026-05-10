'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { StatusBadge } from '../../../../components/status-badge';
import Link from 'next/link';
import { ArrowLeft, FileText, Tag, Clock, Download, Eye } from 'lucide-react';

interface Doc {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  submitted_at: string | null;
  review_reason: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  reviewed_at: string | null;
}

export default function SellerDocumentDetail() {
  const params = useParams();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    apiClient<Doc>(`/api/documents/${params.id}`).then(setDoc).catch(() => {});
    apiClient<{ downloadUrl: string }>(`/api/documents/${params.id}/download-url`)
      .then(data => setPreviewUrl(data.downloadUrl))
      .catch(() => {});
  }, [params.id]);

  if (!doc) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 animate-pulse mb-3">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const resolvedAt = doc.verified_at || doc.reviewed_at;

  return (
    <div className="max-w-3xl">
      <Link href="/seller/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to My Documents
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Document Details</h1>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{doc.file_name}</h2>
            <StatusBadge status={doc.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Tag className="w-4 h-4 text-slate-400" />
            <span>{doc.file_type} — {formatSize(doc.file_size)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{doc.submitted_at ? new Date(doc.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not submitted'}</span>
          </div>
        </div>

        {(doc.review_reason || doc.rejection_reason) && (
          <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${doc.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
            <span className="font-medium">Reason: </span>{doc.rejection_reason || doc.review_reason}
          </div>
        )}

        {resolvedAt && (
          <p className="mt-3 text-xs text-slate-500">
            Resolved: {new Date(resolvedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Preview Card */}
      {previewUrl && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">File Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Preview'}
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          </div>
          {showPreview && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              {doc.file_type.startsWith('image/') ? (
                <img src={previewUrl} alt={doc.file_name} className="max-w-full max-h-[500px] mx-auto" />
              ) : doc.file_type === 'application/pdf' ? (
                <iframe src={previewUrl} className="w-full h-[500px]" title={doc.file_name} />
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>Preview not available. Use Download to view.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
