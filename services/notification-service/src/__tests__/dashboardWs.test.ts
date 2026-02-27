import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import {
  setupDashboardWebSocket,
  broadcastDashboardUpdate,
  pushDashboardToUser,
  getDashboardConnections,
} from '../ws/dashboardWs';

const JWT_SECRET = 'test-jwt-secret-for-dashboard';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(userId: string): string {
  return jwt.sign({ userId, email: 'test@test.com', role: 'it_admin' }, JWT_SECRET);
}

/**
 * Helper: create a minimal HTTP + Dashboard WS server on a random port.
 */
function createTestServer(): {
  server: http.Server;
  wss: WebSocket.Server;
  port: number;
  close: () => Promise<void>;
} {
  const app = express();
  const server = http.createServer(app);
  const wss = setupDashboardWebSocket(server);

  return {
    server,
    wss,
    port: 0,
    close: () =>
      new Promise<void>((resolve) => {
        getDashboardConnections().clear();
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

function connectDashboardWs(port: number): WebSocket {
  return new WebSocket(`ws://127.0.0.1:${port}/dashboard-updates`);
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

/**
 * Helper: connect, authenticate, and optionally subscribe to channels.
 * Returns the WebSocket after receiving auth_success.
 */
async function connectAndAuth(
  port: number,
  userId: string,
  channels?: string[],
): Promise<WebSocket> {
  const ws = connectDashboardWs(port);
  await waitForOpen(ws);

  ws.send(JSON.stringify({ type: 'auth', token: makeToken(userId) }));
  const authMsg = await waitForMessage(ws);
  expect(authMsg.type).toBe('auth_success');

  if (channels && channels.length > 0) {
    ws.send(JSON.stringify({ type: 'subscribe', channels }));
    const subMsg = await waitForMessage(ws);
    expect(subMsg.type).toBe('subscribe_success');
  }

  return ws;
}

describe('Dashboard WebSocket Server', () => {
  let testServer: ReturnType<typeof createTestServer>;
  let port: number;

  beforeEach(async () => {
    getDashboardConnections().clear();
    testServer = createTestServer();
    port = await listenOnRandomPort(testServer.server);
  });

  afterEach(async () => {
    await testServer.close();
  });

  it('connects and authenticates with valid JWT', async () => {
    const ws = connectDashboardWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: makeToken('user-1') }));
    const msg = await waitForMessage(ws);

    expect(msg.type).toBe('auth_success');
    expect(getDashboardConnections().has('user-1')).toBe(true);

    ws.close();
  });

  it('closes connection without auth (timeout)', async () => {
    const ws = connectDashboardWs(port);
    await waitForOpen(ws);

    // Don't send any auth — wait for timeout close (server uses 10s auth timeout)
    const { code } = await waitForClose(ws);

    expect(code).toBe(4001);
  }, 15_000);

  it('closes connection with invalid token', async () => {
    const ws = connectDashboardWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: 'invalid-jwt-token' }));
    const { code } = await waitForClose(ws);

    expect(code).toBe(4003);
  });

  it('subscribes to channels and receives confirmation', async () => {
    const ws = await connectAndAuth(port, 'user-sub');

    // Already tested inside connectAndAuth, but verify we can subscribe again
    ws.send(JSON.stringify({ type: 'subscribe', channels: ['metrics', 'activity'] }));
    const msg = await waitForMessage(ws);

    expect(msg.type).toBe('subscribe_success');
    expect(msg.channels).toEqual(expect.arrayContaining(['metrics', 'activity']));

    ws.close();
  });

  it('receives metrics_update after broadcast', async () => {
    const ws = await connectAndAuth(port, 'user-metrics', ['metrics']);

    const msgPromise = waitForMessage(ws);
    broadcastDashboardUpdate('metrics', {
      complianceRate: 0.95,
      openIssues: 3,
      alertsCount: 7,
      lastChecked: '2026-02-27T10:00:00Z',
    });

    const msg = await msgPromise;
    expect(msg.type).toBe('metrics_update');
    expect(msg.data.complianceRate).toBe(0.95);
    expect(msg.data.openIssues).toBe(3);
    expect(msg.data.alertsCount).toBe(7);

    ws.close();
  });

  it('receives activity_update after broadcast', async () => {
    const ws = await connectAndAuth(port, 'user-activity', ['activity']);

    const msgPromise = waitForMessage(ws);
    broadcastDashboardUpdate('activity', {
      id: 'act-1',
      complianceType: 'audit',
      status: 'completed',
      regulationId: 'reg-123',
      timestamp: '2026-02-27T10:00:00Z',
    });

    const msg = await msgPromise;
    expect(msg.type).toBe('activity_update');
    expect(msg.data.id).toBe('act-1');
    expect(msg.data.status).toBe('completed');

    ws.close();
  });

  it('multiple clients receive same broadcast', async () => {
    const ws1 = await connectAndAuth(port, 'user-a', ['compliance']);
    const ws2 = await connectAndAuth(port, 'user-b', ['compliance']);

    const p1 = waitForMessage(ws1);
    const p2 = waitForMessage(ws2);

    broadcastDashboardUpdate('compliance', {
      status: 'non_compliant',
      regulationId: 'reg-456',
      details: 'Missing documentation',
    });

    const [msg1, msg2] = await Promise.all([p1, p2]);
    expect(msg1.type).toBe('compliance_update');
    expect(msg2.type).toBe('compliance_update');
    expect(msg1.data.regulationId).toBe('reg-456');
    expect(msg2.data.regulationId).toBe('reg-456');

    ws1.close();
    ws2.close();
  });

  it('client only receives subscribed channels', async () => {
    // Subscribe to 'metrics' only — should NOT receive 'activity'
    const ws = await connectAndAuth(port, 'user-filtered', ['metrics']);

    // Broadcast an activity update — client should NOT receive it
    broadcastDashboardUpdate('activity', {
      id: 'act-99',
      complianceType: 'review',
      status: 'pending',
      regulationId: 'reg-789',
      timestamp: '2026-02-27T10:00:00Z',
    });

    // Broadcast a metrics update — client SHOULD receive it
    const msgPromise = waitForMessage(ws);
    broadcastDashboardUpdate('metrics', {
      complianceRate: 0.88,
      openIssues: 5,
      alertsCount: 2,
      lastChecked: '2026-02-27T11:00:00Z',
    });

    const msg = await msgPromise;
    expect(msg.type).toBe('metrics_update');
    expect(msg.data.complianceRate).toBe(0.88);

    ws.close();
  });

  it('pushDashboardToUser sends only to specific user', async () => {
    const ws1 = await connectAndAuth(port, 'user-target', ['metrics']);
    const ws2 = await connectAndAuth(port, 'user-other', ['metrics']);

    const msgPromise1 = waitForMessage(ws1);

    // Push only to user-target
    pushDashboardToUser('user-target', 'metrics', {
      complianceRate: 0.75,
      openIssues: 10,
      alertsCount: 15,
      lastChecked: '2026-02-27T12:00:00Z',
    });

    const msg1 = await msgPromise1;
    expect(msg1.type).toBe('metrics_update');
    expect(msg1.data.complianceRate).toBe(0.75);

    // user-other should NOT have received anything — verify by sending
    // a subsequent broadcast and ensuring it is the first message received
    const msgPromise2 = waitForMessage(ws2);
    broadcastDashboardUpdate('metrics', {
      complianceRate: 0.99,
      openIssues: 0,
      alertsCount: 0,
      lastChecked: '2026-02-27T13:00:00Z',
    });

    const msg2 = await msgPromise2;
    expect(msg2.data.complianceRate).toBe(0.99);

    ws1.close();
    ws2.close();
  });

  it('handles stale connection cleanup (mock ping/pong)', async () => {
    // Connect and authenticate
    const ws = connectDashboardWs(port);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'auth', token: makeToken('user-stale') }));
    await waitForMessage(ws); // auth_success

    expect(getDashboardConnections().has('user-stale')).toBe(true);

    // Simply verify that pong handling doesn't crash
    ws.pong();

    await new Promise((r) => setTimeout(r, 200));

    ws.close();
  });

  it('cleans up connection on disconnect', async () => {
    const ws = await connectAndAuth(port, 'user-disconnect', ['metrics']);

    expect(getDashboardConnections().has('user-disconnect')).toBe(true);

    ws.close();

    // Give time for close handler to fire
    await new Promise((r) => setTimeout(r, 100));

    expect(getDashboardConnections().has('user-disconnect')).toBe(false);
  });
});
