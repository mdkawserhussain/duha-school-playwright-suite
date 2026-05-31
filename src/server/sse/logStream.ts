/**
 * SSE Log Stream Manager — broadcasts log messages to connected clients.
 */

type Listener = (msg: string) => void;

class SSEManager {
  private listeners = new Map<number, Set<Listener>>();

  subscribe(runId: number, listener: Listener): () => void {
    if (!this.listeners.has(runId)) {
      this.listeners.set(runId, new Set());
    }
    this.listeners.get(runId)!.add(listener);
    return () => this.listeners.get(runId)?.delete(listener);
  }

  broadcast(runId: number, msg: string): void {
    this.listeners.get(runId)?.forEach(fn => fn(msg));
  }

  close(runId: number): void {
    this.listeners.delete(runId);
  }
}

export const sseManager = new SSEManager();
