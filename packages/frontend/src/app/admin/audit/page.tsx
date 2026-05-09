'use client';
import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';

interface Log { id: string; action: string; actor_type: string; created_at: string; metadata: any; document: { file_name: string } | null; }

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    apiClient<Log[]>('/api/admin/audit-logs?page=1&limit=50').then(setLogs).catch(() => setLogs([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit History</h1>
      {logs.length === 0 ? (
        <p className="text-gray-500">No audit logs.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Document</th>
                <th className="p-3 text-left">Actor</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-3">{log.document?.file_name || 'N/A'}</td>
                  <td className="p-3">{log.actor_type}</td>
                  <td className="p-3">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
