import { useEffect, useRef, useState, useCallback } from 'react';
import type { MetricsUpdate, ActivityUpdate } from '../types/reports';

interface WebSocketMessage {
  type: 'auth_success' | 'auth_error' | 'metrics_update' | 'activity_update' | 'ping';
  data?: unknown;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/dashboard-updates`;
}

export function useDashboardWebSocket(): {
  isConnected: boolean;
  latestMetrics: MetricsUpdate | null;
  latestActivity: ActivityUpdate | null;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [latestMetrics, setLatestMetrics] = useState<MetricsUpdate | null>(null);
  const [latestActivity, setLatestActivity] = useState<ActivityUpdate | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        // Send auth message with JWT token
        ws.send(JSON.stringify({ type: 'auth', token }));
        // Subscribe to channels
        ws.send(
          JSON.stringify({ type: 'subscribe', channels: ['metrics', 'activity', 'compliance'] }),
        );
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'auth_success':
              setIsConnected(true);
              reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
              break;

            case 'auth_error':
              setIsConnected(false);
              ws.close();
              break;

            case 'metrics_update':
              setLatestMetrics(message.data as MetricsUpdate);
              break;

            case 'activity_update':
              setLatestActivity(message.data as ActivityUpdate);
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        wsRef.current = null;

        // Exponential backoff reconnect
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, delay);
      };

      ws.onerror = () => {
        // onerror is always followed by onclose, so reconnect logic is handled there
      };
    } catch {
      // WebSocket constructor can throw if the URL is invalid
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, latestMetrics, latestActivity };
}
