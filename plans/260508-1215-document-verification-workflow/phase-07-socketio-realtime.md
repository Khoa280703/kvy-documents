# Phase 7: Socket.IO Real-time

## Context
- [DESIGN.md](../../DESIGN.md) — Section 5 (Decision 2: optimistic locking + presence), Section 6 (F4, F5)
- Depends on: Phase 5 (Seller UI), Phase 6 (Admin UI)

## Overview
- **Priority:** P2
- **Status:** complete
- **Effort:** 2h
- **Description:** Real-time seller notifications on verification status changes, admin review presence/soft locking, notification persistence + fetch on reconnect.

## Key Insights
- Socket.IO rooms: each user joins `user:${userId}` room for targeted notifications
- Admin review presence: join `review:${documentId}` room when viewing a document
- Notifications are persisted FIRST, then pushed via Socket.IO (dual approach — never lose notifications)
- On reconnect: client fetches unread notifications from REST API

## Requirements

### Functional
- Seller receives real-time notification when document status changes
- Admin sees "Admin X is reviewing this document" on review page
- When admin leaves review page, presence is removed
- Notification bell/badge shows unread count
- `GET /api/notifications` — fetch unread notifications
- `PATCH /api/notifications/:id/read` — mark as read

### Non-Functional
- Socket.IO with Redis adapter (horizontal scaling ready)
- Graceful reconnection with exponential backoff
- Fire-and-forget push — REST API is source of truth

## Related Code Files

### Files to Create
- `packages/backend/src/socket/socket-setup.ts` — Socket.IO server init + auth
- `packages/backend/src/socket/socket-events.ts` — event handlers
- `packages/backend/src/routes/notification-routes.ts` — REST notification endpoints
- `packages/frontend/src/lib/socket-client.ts` — Socket.IO client setup
- `packages/frontend/src/hooks/use-socket.ts` — socket connection hook
- `packages/frontend/src/hooks/use-notifications.ts` — notifications state
- `packages/frontend/src/components/notification-bell.tsx` — notification indicator

### Files to Modify
- `packages/backend/src/index.ts` — attach Socket.IO to HTTP server
- `packages/backend/src/services/notification-service.ts` — emit after persist
- `packages/frontend/src/app/seller/layout.tsx` — add notification bell
- `packages/frontend/src/app/admin/review/[id]/page.tsx` — add presence indicator

## Implementation Steps

### 1. Set up Socket.IO server
```typescript
// packages/backend/src/socket/socket-setup.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: FRONTEND_URL, credentials: true },
  });

  // Redis adapter for horizontal scaling
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware: extract JWT from cookie/handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || parseCookie(socket.handshake.headers.cookie);
    const user = verifyToken(token);
    if (!user) return next(new Error('Authentication error'));
    socket.data.user = user;
    next();
  });

  io.on('connection', handleConnection);
  return io;
}
```

### 2. Define socket events
```typescript
// packages/backend/src/socket/socket-events.ts

function handleConnection(socket: Socket) {
  const { userId, role } = socket.data.user;
  
  // Join user's personal room
  socket.join(`user:${userId}`);

  // Admin: join/leave review rooms
  if (role === 'admin') {
    socket.on('review:join', ({ documentId }) => {
      socket.join(`review:${documentId}`);
      socket.to(`review:${documentId}`).emit('review:presence', {
        adminName: socket.data.user.name,
        action: 'joined',
      });
    });

    socket.on('review:leave', ({ documentId }) => {
      socket.leave(`review:${documentId}`);
      socket.to(`review:${documentId}`).emit('review:presence', {
        adminName: socket.data.user.name,
        action: 'left',
      });
    });
  }

  socket.on('disconnect', () => {
    // Auto-leave all rooms (Socket.IO handles this)
  });
}
```

### 3. Emit notifications from backend services
```typescript
// Update packages/backend/src/services/notification-service.ts
export async function createAndEmitNotification(params: {
  userId: string;
  documentId: string;
  type: string;
  message: string;
}) {
  // 1. Persist to DB (source of truth)
  const notification = await prisma.notification.create({ data: params });
  // 2. Push via Socket.IO (best effort)
  io.to(`user:${params.userId}`).emit('notification', notification);
}
```

### 4. Create notification REST routes
```typescript
// packages/backend/src/routes/notification-routes.ts

// GET /api/notifications?is_read=false
// Auth: requireAuth
// Returns notifications for current user

// PATCH /api/notifications/:id/read
// Auth: requireAuth
// Mark notification as read (only own notifications)
```

### 5. Create frontend socket client
```typescript
// packages/frontend/src/lib/socket-client.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token?: string): Socket {
  if (socket?.connected) return socket;
  socket = io(API_BASE, {
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}
```

### 6. Create notification hook + bell component
```typescript
// packages/frontend/src/hooks/use-notifications.ts
// Fetch unread notifications on mount
// Listen for 'notification' socket events
// Provide: notifications, unreadCount, markAsRead()

// packages/frontend/src/components/notification-bell.tsx
// Bell icon with unread count badge
// Dropdown showing recent notifications
// Click notification → navigate to relevant document
// Mark as read on view
```

### 7. Add presence indicator to admin review page
```typescript
// In packages/frontend/src/app/admin/review/[id]/page.tsx
// On mount: emit 'review:join' with documentId
// On unmount: emit 'review:leave' with documentId
// Listen for 'review:presence' events
// Show banner: "Admin X is also reviewing this document"
```

## Todo List
- [ ] Set up Socket.IO server with Redis adapter
- [ ] Implement auth middleware for socket connections
- [ ] Define connection/review events
- [ ] Update notification service to emit via Socket.IO
- [ ] Create notification REST routes
- [ ] Create frontend socket client
- [ ] Create useNotifications hook
- [ ] Create notification bell component
- [ ] Add admin review presence indicator
- [ ] Test seller notification on status change
- [ ] Test admin presence on review page

## Success Criteria
- Seller sees real-time notification when verification completes
- Admin sees presence indicator when another admin is reviewing same document
- Notifications persist — visible on page reload (REST fallback)
- Socket reconnects after disconnect
- Unread count updates in real-time

## Risk Assessment
- **Risk:** Socket auth with httpOnly cookie across origins
  - **Mitigation:** Pass token in socket handshake auth, or parse cookie from handshake headers
- **Risk:** Memory leak from socket listeners in React
  - **Mitigation:** Cleanup in useEffect return function
