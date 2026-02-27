import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

/**
 * Returns the JWT secret, reading from process.env at call time
 * so that tests can set the value before verification occurs.
 */
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'changeme';
}

/**
 * Map of userId -> Set of WebSocket connections.
 * Supports multiple simultaneous connections per user.
 */
const userConnections = new Map<string, Set<WebSocket>>();

/** Expose for testing */
export function getUserConnections(): Map<string, Set<WebSocket>> {
  return userConnections;
}

/**
 * Push a notification payload to all active WebSocket connections for a user.
 */
export function pushToUser(userId: string, notification: object): void {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const payload = JSON.stringify(notification);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Remove a WebSocket connection from the user map.
 */
function removeConnection(userId: string, ws: WebSocket): void {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

/**
 * Creates and attaches a WebSocket server to the given HTTP server.
 *
 * Protocol:
 * 1. Client connects to ws://<host>/notifications
 * 2. Client MUST send `{ "type": "auth", "token": "<jwt>" }` as the first message
 * 3. Server verifies the JWT and associates the connection with the userId
 * 4. Server sends `{ "type": "auth_success" }` on successful auth
 * 5. Server pushes notifications as JSON to the client
 *
 * Heartbeat: ping every 30s, terminate connections that don't respond.
 */
export function setupWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/notifications' });

  // Heartbeat interval: ping every 30s
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as WebSocket & { isAlive?: boolean; userId?: string };
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
    const extWs = ws as WebSocket & { isAlive?: boolean; userId?: string; authenticated?: boolean };
    extWs.isAlive = true;
    extWs.authenticated = false;

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
      // If already authenticated, ignore further messages (read-only stream)
      if (extWs.authenticated) return;

      try {
        const msg = JSON.parse(data.toString());

        if (msg.type !== 'auth' || !msg.token) {
          ws.close(4002, 'First message must be auth');
          clearTimeout(authTimeout);
          return;
        }

        const decoded = jwt.verify(msg.token, getJwtSecret()) as {
          userId: string;
          [key: string]: unknown;
        };
        const userId = String(decoded.userId);

        extWs.authenticated = true;
        extWs.userId = userId;
        clearTimeout(authTimeout);

        // Register connection
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId)!.add(ws);

        ws.send(JSON.stringify({ type: 'auth_success' }));
      } catch {
        ws.close(4003, 'Invalid token');
        clearTimeout(authTimeout);
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
