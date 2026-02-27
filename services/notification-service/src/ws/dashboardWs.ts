import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

/**
 * Extended WebSocket type for dashboard connections.
 * Tracks authentication state, user identity, heartbeat, and channel subscriptions.
 */
interface DashboardWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
  authenticated?: boolean;
  subscribedChannels?: Set<string>;
}

/**
 * Valid dashboard channels that clients can subscribe to.
 */
const VALID_CHANNELS = new Set(['metrics', 'activity', 'compliance']);

/**
 * Returns the JWT secret, reading from process.env at call time
 * so that tests can set the value before verification occurs.
 */
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'changeme';
}

/**
 * Map of userId -> Set of DashboardWebSocket connections.
 * Supports multiple simultaneous connections per user.
 */
const dashboardConnections = new Map<string, Set<WebSocket>>();

/**
 * Expose the connection map for testing.
 */
export function getDashboardConnections(): Map<string, Set<WebSocket>> {
  return dashboardConnections;
}

/**
 * Remove a WebSocket connection from the dashboard user map.
 */
function removeConnection(userId: string, ws: WebSocket): void {
  const connections = dashboardConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      dashboardConnections.delete(userId);
    }
  }
}

/**
 * Broadcast a dashboard update to ALL connected and subscribed clients on a given channel.
 *
 * The message format sent to clients:
 *   { type: "<channel>_update", data: <data> }
 */
export function broadcastDashboardUpdate(channel: string, data: object): void {
  const messageType = `${channel}_update`;
  const payload = JSON.stringify({ type: messageType, data });

  for (const connections of dashboardConnections.values()) {
    for (const ws of connections) {
      const extWs = ws as DashboardWebSocket;
      if (
        extWs.readyState === WebSocket.OPEN &&
        extWs.authenticated &&
        extWs.subscribedChannels?.has(channel)
      ) {
        ws.send(payload);
      }
    }
  }
}

/**
 * Push a dashboard update to all connections of a specific user on a given channel.
 *
 * Only sends to connections that have subscribed to the specified channel.
 */
export function pushDashboardToUser(userId: string, channel: string, data: object): void {
  const connections = dashboardConnections.get(userId);
  if (!connections) return;

  const messageType = `${channel}_update`;
  const payload = JSON.stringify({ type: messageType, data });

  for (const ws of connections) {
    const extWs = ws as DashboardWebSocket;
    if (
      extWs.readyState === WebSocket.OPEN &&
      extWs.authenticated &&
      extWs.subscribedChannels?.has(channel)
    ) {
      ws.send(payload);
    }
  }
}

/**
 * Creates and attaches a Dashboard WebSocket server to the given HTTP server.
 *
 * Protocol:
 * 1. Client connects to ws://<host>/dashboard-updates
 * 2. Client MUST send `{ "type": "auth", "token": "<jwt>" }` as the first message
 * 3. Server verifies the JWT and associates the connection with the userId
 * 4. Server sends `{ "type": "auth_success" }` on successful auth
 * 5. Client sends `{ "type": "subscribe", "channels": ["metrics", "activity", "compliance"] }`
 * 6. Server sends `{ "type": "subscribe_success", "channels": [...] }`
 * 7. Server pushes updates as JSON to subscribed clients
 *
 * Heartbeat: ping every 30s, terminate connections that don't respond.
 */
export function setupDashboardWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/dashboard-updates' });

  // Heartbeat interval: ping every 30s
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as DashboardWebSocket;
      if (extWs.isAlive === false) {
        // Stale connection — terminate
        if (extWs.userId) {
          removeConnection(extWs.userId, ws);
        }
        return ws.terminate();
      }
      extWs.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const extWs = ws as DashboardWebSocket;
    extWs.isAlive = true;
    extWs.authenticated = false;
    extWs.subscribedChannels = new Set();

    // Set a 10s auth timeout — if the client doesn't authenticate, close
    const authTimeout = setTimeout(() => {
      if (!extWs.authenticated) {
        ws.close(4001, 'Authentication timeout');
      }
    }, 10_000);

    ws.on('pong', () => {
      extWs.isAlive = true;
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Handle authentication (must be first message if not yet authenticated)
        if (!extWs.authenticated) {
          if (msg.type !== 'auth' || !msg.token) {
            ws.close(4002, 'First message must be auth');
            clearTimeout(authTimeout);
            return;
          }

          try {
            const decoded = jwt.verify(msg.token, getJwtSecret()) as {
              userId: string;
              [key: string]: unknown;
            };
            const userId = String(decoded.userId);

            extWs.authenticated = true;
            extWs.userId = userId;
            clearTimeout(authTimeout);

            // Register connection
            if (!dashboardConnections.has(userId)) {
              dashboardConnections.set(userId, new Set());
            }
            dashboardConnections.get(userId)!.add(ws);

            ws.send(JSON.stringify({ type: 'auth_success' }));
          } catch {
            ws.close(4003, 'Invalid token');
            clearTimeout(authTimeout);
          }
          return;
        }

        // Handle channel subscription (only after authentication)
        if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
          const validSubscriptions: string[] = [];
          for (const channel of msg.channels) {
            if (typeof channel === 'string' && VALID_CHANNELS.has(channel)) {
              extWs.subscribedChannels!.add(channel);
              validSubscriptions.push(channel);
            }
          }

          ws.send(
            JSON.stringify({
              type: 'subscribe_success',
              channels: Array.from(extWs.subscribedChannels!),
            }),
          );
          return;
        }

        // Unknown message type after auth — ignore silently
      } catch {
        // Malformed JSON — ignore
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (extWs.userId) {
        removeConnection(extWs.userId, ws);
      }
    });
  });

  return wss;
}
