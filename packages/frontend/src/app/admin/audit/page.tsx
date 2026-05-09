'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { ClipboardList, FileText, User, Clock, Search } from 'lucide-react';

interface Log {
  id: string;
  action: string;
  actor_type: string;
  created_at: string;
  metadata: any;
  document: { file_name: string } | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient<Log[]>('/api/admin/audit-logs?page=1&limit=50').then(setLogs).catch(() => setLogs([]));
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor_type.toLowerCase().includes(q) ||
      log.document?.file_name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-slate-500 mt-1">System event history and activity trail</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="pl-9 pr-4 py-2 w-full sm:w-64 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {logs.length === 0 ? 'No audit logs' : 'No matching logs'}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {logs.length === 0 ? 'System events will appear here as they occur.' : 'Try adjusting your search terms.'}
          </p>
        </div>
      ) : (
        /* Audit Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-700">{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{log.document?.file_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{log.actor_type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium whitespace-nowrap">
                        {log.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredLogs.map(log => (
              <div key={log.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                    {log.action}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">{log.document?.file_name || 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{log.actor_type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
