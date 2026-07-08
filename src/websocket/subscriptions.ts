import { WebSocket } from 'ws';

// Map>
//
// WHY Map not object? Map has O(1) has/get/set/delete. Object is fine too
// but Map is semantically correct for key-value stores.
//
// WHY Set not Array? Deleting from a Set is O(1). Deleting from an Array
// is O(n) because you must find the item first. With 10,000 connections
// disconnecting constantly, O(1) deletion matters.
const connections = new Map<string, Set<WebSocket>>();

// Called when a user authenticates their WebSocket connection.
export function addConnection(userId: string, ws: WebSocket): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);

  console.log(
    `[subscriptions] + userId=${userId}`,
    `connections=${connections.get(userId)!.size}`,
    `total_users=${connections.size}`,
  );
}

// Called when a WebSocket connection closes or is terminated.
// Must be called on BOTH close and error events to prevent memory leaks.
// If we never delete dead connections the Map grows forever.
export function removeConnection(userId: string, ws: WebSocket): void {
  const sockets = connections.get(userId);
  if (!sockets) return;

  sockets.delete(ws);

  // When the last connection for a user closes, remove the userId entry too.
  // Without this, the Map accumulates empty Sets and slowly leaks memory.
  if (sockets.size === 0) {
    connections.delete(userId);
  }

  console.log(
    `[subscriptions] - userId=${userId}`,
    `remaining=${sockets.size}`,
  );
}

// Called by subscriber.ts when a Redis pub/sub message arrives.
// Finds all open WebSocket connections for this userId and sends the message.
// Skips connections that are closing or already closed (readyState check).
export function broadcastToUser(userId: string, message: unknown): void {
  const sockets = connections.get(userId);

  // User has no open connections on this server instance — skip silently.
  // Another server instance may have their connection and will handle it.
  if (!sockets || sockets.size === 0) return;

  const serialized = JSON.stringify(message);

  for (const socket of sockets) {
    // WebSocket.OPEN = 1
    // Only send to connections that are fully open.
    // CONNECTING=0, CLOSING=2, CLOSED=3 — skip these.
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(serialized);
    }
  }
}

// Utility — used for monitoring and health checks.
export function getTotalConnections(): number {
  let total = 0;
  for (const sockets of connections.values()) {
    total += sockets.size;
  }
  return total;
}

export function getTotalUsers(): number {
  return connections.size;
}