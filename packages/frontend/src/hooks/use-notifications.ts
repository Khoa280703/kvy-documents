'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { connectSocket } from '../lib/socket-client';

interface Notification { id: string; message: string; type: string; is_read: boolean; created_at: string; document_id: string; }

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    const data = await apiClient<Notification[]>('/api/notifications?is_read=false');
    setNotifications(data);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const socket = connectSocket();
    socket.on('notification', (n: Notification) => {
      setNotifications(prev => [n, ...prev]);
    });
    return () => { socket.off('notification'); };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await apiClient(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, unreadCount: notifications.length, markAsRead, fetchNotifications };
}
