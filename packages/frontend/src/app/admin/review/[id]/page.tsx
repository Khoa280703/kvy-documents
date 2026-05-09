'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { StatusBadge } from '../../../../components/status-badge';

interface Doc { id: string; file_name: string; file_type: string; file_size: number; status: string; version: number; submitted_at: string | null; seller: { name: string; email: string }; }

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
      await apiClient(`/api/admin/documents/${doc.id}/review`, { method: 'POST', body: JSON.stringify({ action, reason: reason || 'Approved', version: doc.version }) });
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

  if (!doc) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Document Review</h1>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <p className="font-medium">{doc.file_name}</p>
        <p className="text-sm text-gray-500">Type: {doc.file_type}</p>
        <p className="text-sm text-gray-500">Size: {(doc.file_size / 1024).toFixed(1)} KB</p>
        <p className="text-sm text-gray-500">Seller: {doc.seller?.name} ({doc.seller?.email})</p>
        <p className="text-sm text-gray-500">Submitted: {doc.submitted_at ? new Date(doc.submitted_at).toLocaleString() : 'N/A'}</p>
        <StatusBadge status={doc.status} />
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Review reason (required for reject)" className="w-full p-2 border rounded mb-4" rows={3} />
      <div className="flex gap-4">
        <button onClick={() => handleReview('approve')} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Approve</button>
        <button onClick={() => handleReview('reject')} disabled={loading || !reason.trim()} className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">Reject</button>
      </div>
    </div>
  );
}
