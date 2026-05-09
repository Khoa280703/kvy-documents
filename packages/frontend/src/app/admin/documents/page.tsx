'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import Link from 'next/link';
import { StatusBadge } from '../../../components/status-badge';
import { FileText, User, Clock } from 'lucide-react';

interface Doc {
  id: string;
  file_name: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  review_reason: string | null;
  seller: { name: string; email: string };
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending_upload', label: 'Pending Upload' },
  { value: 'pending_verification', label: 'Verifying' },
  { value: 'pending_review', label: 'Under Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export default function AllDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    apiClient<Doc[]>('/api/documents').then(setDocs).catch(() => setDocs([]));
  }, []);

  const filtered = filter ? docs.filter(d => d.status === filter) : docs;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Documents</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(sf => (
            <button
              key={sf.value}
              onClick={() => setFilter(sf.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                filter === sf.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No documents found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <Link
              key={doc.id}
              href={`/admin/review/${doc.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {doc.seller?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {doc.submitted_at
                          ? new Date(doc.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {doc.review_reason && (
                      <p className="text-sm text-slate-500 mt-1 truncate">Reason: {doc.review_reason}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
