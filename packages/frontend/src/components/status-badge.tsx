import { CheckCircle, XCircle, Clock, AlertTriangle, Eye, FileText, Archive } from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string; icon: any }> = {
  pending_upload:      { bg: 'bg-slate-100',     text: 'text-slate-600',      dot: 'bg-slate-400',       label: 'Pending Upload', icon: FileText },
  pending_verification:{ bg: 'bg-blue-50',        text: 'text-blue-700',       dot: 'bg-blue-500',        label: 'Verifying',      icon: Clock },
  verified:            { bg: 'bg-emerald-50',     text: 'text-emerald-700',    dot: 'bg-emerald-500',     label: 'Verified',       icon: CheckCircle },
  rejected:            { bg: 'bg-red-50',         text: 'text-red-700',        dot: 'bg-red-500',         label: 'Rejected',       icon: XCircle },
  inconclusive:        { bg: 'bg-amber-50',       text: 'text-amber-700',      dot: 'bg-amber-500',       label: 'Under Review',   icon: AlertTriangle },
  pending_review:      { bg: 'bg-amber-50',       text: 'text-amber-700',      dot: 'bg-amber-500',       label: 'Under Review',   icon: Eye },
  approved:            { bg: 'bg-emerald-50',     text: 'text-emerald-700',    dot: 'bg-emerald-500',     label: 'Approved',       icon: CheckCircle },
  expired:             { bg: 'bg-slate-100',      text: 'text-slate-500',      dot: 'bg-slate-400',       label: 'Expired',        icon: Archive },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending_upload;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
