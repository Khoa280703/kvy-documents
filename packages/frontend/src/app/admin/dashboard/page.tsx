'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/status-badge';
import Link from 'next/link';
import { FileSearch, Clock, User, FileText, ArrowRight } from 'lucide-react';

interface Doc {
  id: string;
  file_name: string;
  status: string;
  submitted_at: string | null;
  seller: { name: string; email: string };
}

export default function AdminDashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    apiClient<Doc[]>('/api/admin/pending-reviews').then(setDocs).catch(() => setDocs([]));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pending Reviews</h1>
        <p className="text-slate-500 mt-1">Documents requiring admin review ({docs.length})</p>
      </div>

      {/* Empty State */}
      {docs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
            <FileSearch className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">All caught up!</h3>
          <p className="text-slate-500 max-w-sm mx-auto">No documents are pending review at the moment.</p>
        </div>
      ) : (
        /* Document List */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {docs.map(doc => (
              <Link
                key={doc.id}
                href={`/admin/review/${doc.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-colors cursor-pointer group"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      {doc.seller?.name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {doc.submitted_at ? new Date(doc.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Status & Arrow */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={doc.status} />
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
