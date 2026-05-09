const statusConfig: Record<string, { color: string; label: string }> = {
  pending_upload: { color: 'bg-gray-100 text-gray-700', label: 'Pending Upload' },
  pending_verification: { color: 'bg-yellow-100 text-yellow-700', label: 'Verifying...' },
  verified: { color: 'bg-green-100 text-green-700', label: 'Verified' },
  rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
  inconclusive: { color: 'bg-orange-100 text-orange-700', label: 'Under Review' },
  pending_review: { color: 'bg-orange-100 text-orange-700', label: 'Under Review' },
  approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
  expired: { color: 'bg-gray-100 text-gray-700', label: 'Expired' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
  return <span className={`px-2 py-1 rounded-full text-sm ${cfg.color}`}>{cfg.label}</span>;
}
