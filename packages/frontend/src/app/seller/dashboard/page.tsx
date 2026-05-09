'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { StatusBadge } from '../../../components/status-badge';
import Link from 'next/link';

interface Doc { id: string; file_name: string; status: string; created_at: string; submitted_at: string | null; rejection_reason: string | null; review_reason: string | null; }

export default function SellerDashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchDocs = () => {
    apiClient<Doc[]>('/api/documents').then(setDocs).catch(() => setDocs([]));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this pending upload?')) return;
    setCancelling(id);
    try {
      await apiClient(`/api/documents/${id}`, { method: 'DELETE' });
      fetchDocs();
    } catch {
      alert('Failed to cancel upload. Please try again.');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <Link href="/seller/upload" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Upload New</Link>
      </div>
      {docs.length === 0 ? (
        <p className="text-gray-500">No documents uploaded yet. <Link href="/seller/upload" className="text-blue-600 underline">Upload one</Link>.</p>
      ) : (
        <div className="space-y-4">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
              <div>
                <p className="font-medium">{doc.file_name}</p>
                <p className="text-sm text-gray-500">Submitted: {doc.submitted_at ? new Date(doc.submitted_at).toLocaleString() : 'N/A'}</p>
                {doc.rejection_reason && <p className="text-sm text-red-500">Reason: {doc.rejection_reason}</p>}
                {doc.review_reason && !doc.rejection_reason && <p className="text-sm text-green-600">Reason: {doc.review_reason}</p>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={doc.status} />
                {doc.status === 'pending_upload' && (
                  <button
                    onClick={() => handleCancel(doc.id)}
                    disabled={cancelling === doc.id}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {cancelling === doc.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
