const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8050";

export interface WsEnvelope<T = unknown> {
  type: string;
  data: T;
}

export interface GameCountdownData {
  value: number;
}

function wsBaseUrl(): string {
  if (API_BASE.startsWith("https://")) {
    return API_BASE.replace(/^https/, "wss");
  }
  return API_BASE.replace(/^http/, "ws");
}

export function connectRoomSocket(
  roomCode: string,
  onMessage: (msg: WsEnvelope) => void,
  onOpen?: () => void
): () => void {
  const code = roomCode.toUpperCase();
  const url = `${wsBaseUrl()}/api/ws/rooms/${encodeURIComponent(code)}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsEnvelope;
        onMessage(msg);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = (event) => {
      if (!closed) {
        console.warn(`[ws] disconnected from room ${code}, retry in 2s`, event.code, event.reason);
        retryTimer = setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {
      console.error(`[ws] connection error for room ${code}`);
      ws?.close();
    };
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}
