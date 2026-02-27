import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { setupWebSocket, pushToUser, getUserConnections } from '../ws/notificationWs';

const JWT_SECRET = 'test-jwt-secret-for-notifications';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET);
}

/**
 * Helper: create a minimal HTTP + WS server on a random port.
 */
function createTestServer(): {
  server: http.Server;
  wss: WebSocket.Server;
  port: number;
  close: () => Promise<void>;
} {
  const app = express();
  const server = http.createServer(app);
  const wss = setupWebSocket(server);

  return {
    server,
    wss,
    port: 0, // will be set after listen
    close: () =>
      new Promise<void>((resolve) => {
        // Clean up user connections to avoid leaks across tests
        getUserConnections().clear();
        wss.close(() => {
          server.close(() => resolve());
        });
      }),
  };
}

function listenOnRandomPort(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(addr.port);
      }
    });
  });
}

function connectWs(port: number): WebSocket {
  return new WebSocket(`ws://127.0.0.1:${port}/notifications`);
}

function waitForMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for WS message')), 5000);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function waitForClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once('close', (code, reason) => {
      resolve({ code, reason: reason.toString() });
    });
  });
}

describe('WebSocket Notification Server', () => {
  let testServer: ReturnType<typeof createTestServer>;
  let port: number;

  beforeEach(async () => {
    getUserConnections().clear();
    testServer = createTestServer();
    port = await listenOnRandomPort(testServer.server);
  });

  afterEach(async () => {
    await testServer.close();
  });

  it('connects and authenticates with valid JWT', async () => {
    const ws = connectWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: makeToken('user-1') }));
    const msg = await waitForMessage(ws);

    expect(msg.type).toBe('auth_success');
    expect(getUserConnections().has('user-1')).toBe(true);

    ws.close();
  });

  it('rejects connection without proper auth message', async () => {
    const ws = connectWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'subscribe', channel: 'foo' }));
    const { code } = await waitForClose(ws);

    expect(code).toBe(4002);
  });

  it('receives push notification after creation', async () => {
    const ws = connectWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: makeToken('user-push') }));
    await waitForMessage(ws); // auth_success

    const msgPromise = waitForMessage(ws);
    pushToUser('user-push', { id: 'n1', title: 'Hello' });

    const msg = await msgPromise;
    expect(msg.id).toBe('n1');
    expect(msg.title).toBe('Hello');

    ws.close();
  });

  it('multiple connections for same user both receive notification', async () => {
    const ws1 = connectWs(port);
    const ws2 = connectWs(port);
    await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);

    ws1.send(JSON.stringify({ type: 'auth', token: makeToken('user-multi') }));
    ws2.send(JSON.stringify({ type: 'auth', token: makeToken('user-multi') }));

    await Promise.all([waitForMessage(ws1), waitForMessage(ws2)]); // auth_success x2

    const p1 = waitForMessage(ws1);
    const p2 = waitForMessage(ws2);
    pushToUser('user-multi', { id: 'n2', title: 'Both' });

    const [msg1, msg2] = await Promise.all([p1, p2]);
    expect(msg1.title).toBe('Both');
    expect(msg2.title).toBe('Both');

    ws1.close();
    ws2.close();
  });

  it('cleans up connection on close', async () => {
    const ws = connectWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: makeToken('user-cleanup') }));
    await waitForMessage(ws); // auth_success

    expect(getUserConnections().has('user-cleanup')).toBe(true);

    ws.close();

    // Give time for close handler to fire
    await new Promise((r) => setTimeout(r, 100));

    expect(getUserConnections().has('user-cleanup')).toBe(false);
  });

  it('handles ping/pong without crashing', async () => {
    // Simply verify a connection survives; the 30s heartbeat won't fire in test
    // but we confirm the server setup doesn't error out
    const ws = connectWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: makeToken('user-ping') }));
    const msg = await waitForMessage(ws);
    expect(msg.type).toBe('auth_success');

    // Manually send a pong (the server sends ping, client responds with pong)
    ws.pong();

    // No crash — wait a moment and then close cleanly
    await new Promise((r) => setTimeout(r, 200));

    ws.close();
  });
});
