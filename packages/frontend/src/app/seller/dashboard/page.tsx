'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/status-badge';
import Link from 'next/link';
import { FileText, Plus, X, FileSearch, Clock, AlertTriangle } from 'lucide-react';

interface Doc {
  id: string; file_name: string; status: string;
  created_at: string; submitted_at: string | null;
  rejection_reason: string | null; review_reason: string | null;
}

export default function SellerDashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchDocs = () => {
    apiClient<Doc[]>('/api/documents').then(setDocs).catch(() => setDocs([]));
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this pending upload?')) return;
    setCancelling(id);
    try {
      await apiClient(`/api/documents/${id}`, { method: 'DELETE' });
      fetchDocs();
    } catch { alert('Failed to cancel upload.'); }
    finally { setCancelling(null); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
          <p className="text-slate-500 mt-1">Track your document verification status</p>
        </div>
        <Link
          href="/seller/upload"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Upload New
        </Link>
      </div>

      {/* Empty State */}
      {docs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No documents yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Upload your first document to start the verification process.</p>
          <Link
            href="/seller/upload"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </Link>
        </div>
      ) : (
        /* Document List */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {docs.map(doc => (
              <div key={doc.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                {/* File Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                  <FileText className="w-5 h-5" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.submitted_at ? `Submitted ${new Date(doc.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Uploaded'}
                  </p>
                  {doc.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">{doc.rejection_reason}</p>
                  )}
                  {doc.review_reason && !doc.rejection_reason && (
                    <p className="text-xs text-emerald-600 mt-1">{doc.review_reason}</p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={doc.status} />
                  {doc.status === 'pending_upload' && (
                    <button
                      onClick={() => handleCancel(doc.id)}
                      disabled={cancelling === doc.id}
                      className="text-slate-400 hover:text-red-600 cursor-pointer p-1 disabled:opacity-50 transition-colors"
                      aria-label="Cancel upload"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
