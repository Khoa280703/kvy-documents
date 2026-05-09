'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import Link from 'next/link';
import { StatusBadge } from '../../../components/status-badge';

interface Doc { id: string; file_name: string; status: string; submitted_at: string | null; seller: { name: string; email: string }; }

export default function AdminDashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    apiClient<Doc[]>('/api/admin/pending-reviews').then(setDocs).catch(() => setDocs([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pending Reviews ({docs.length})</h1>
      {docs.length === 0 ? (
        <p className="text-gray-500">No documents pending review.</p>
      ) : (
        <div className="space-y-4">
          {docs.map(doc => (
            <Link key={doc.id} href={`/admin/review/${doc.id}`} className="block bg-white p-4 rounded-lg shadow hover:shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{doc.file_name}</p>
                  <p className="text-sm text-gray-500">Seller: {doc.seller?.name} ({doc.seller?.email})</p>
                  <p className="text-sm text-gray-500">Submitted: {doc.submitted_at ? new Date(doc.submitted_at).toLocaleString() : 'N/A'}</p>
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
