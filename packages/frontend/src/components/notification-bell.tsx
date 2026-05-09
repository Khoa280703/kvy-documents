'use client';
import { useState } from 'react';
import { useNotifications } from '../hooks/use-notifications';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  if (unreadCount === 0) return (
    <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">🔔</button>
  );

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-gray-500 hover:text-gray-700">🔔 <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{unreadCount}</span></button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          {notifications.map(n => (
            <button key={n.id} onClick={() => { markAsRead(n.id); setOpen(false); }} className="w-full text-left p-3 border-b hover:bg-gray-50">
              <p className="text-sm font-medium">{n.type}</p>
              <p className="text-sm text-gray-600">{n.message}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
