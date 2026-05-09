'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { StatusBadge } from '../../../../components/status-badge';
import Link from 'next/link';
import { ArrowLeft, FileText, User, Mail, Clock, Tag, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Doc {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  version: number;
  submitted_at: string | null;
  seller: { name: string; email: string };
}

export default function ReviewPage() {
  const params = useParams();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    apiClient<Doc>(`/api/documents/${params.id}`).then(setDoc).catch(() => {});
  }, [params.id]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!doc || action === 'reject' && !reason.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiClient(`/api/admin/documents/${doc.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: reason || 'Approved', version: doc.version }),
      });
      router.replace('/admin/dashboard');
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Conflict')) {
        setError('This document was already reviewed by another admin');
        router.replace('/admin/dashboard');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  if (!doc) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 animate-pulse mb-3">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">Loading document...</p>
      </div>
    </div>
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-3xl">
      {/* Back Link */}
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        Back to Pending Reviews
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Document Review</h1>
        <p className="text-slate-500 mt-1">Review and make a decision on this document</p>
      </div>

      {/* Document Info Card */}
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
            <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{doc.file_type}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{formatSize(doc.file_size)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{doc.seller?.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">{doc.seller?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>
              {doc.submitted_at ? new Date(doc.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Review Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Review Decision</h3>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="review-reason" className="block text-sm font-medium text-slate-700 mb-1.5">
            Review Reason
          </label>
          <textarea
            id="review-reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Provide a reason for your decision (required for reject)..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all resize-none"
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleReview('approve')}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Approve Document
          </button>
          <button
            onClick={() => handleReview('reject')}
            disabled={loading || !reason.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
          >
            <XCircle className="w-5 h-5" />
            Reject Document
          </button>
        </div>
      </div>
    </div>
  );
}
