const DEFAULT_TIMEOUT_MS = 15_000;

export class CdpClient {
  #webSocket;
  #nextId = 1;
  #pending = new Map();
  #eventListeners = new Set();

  constructor(webSocket) {
    this.#webSocket = webSocket;

    webSocket.addEventListener("message", (event) => {
      const packet = JSON.parse(String(event.data));

      if (typeof packet.id === "number") {
        const pendingRequest = this.#pending.get(packet.id);
        if (!pendingRequest) return;

        clearTimeout(pendingRequest.timeout);
        this.#pending.delete(packet.id);

        if (packet.error) {
          pendingRequest.reject(
            new Error(
              `CDP ${pendingRequest.method} falhou: ${packet.error.message ?? "erro desconhecido"}`,
            ),
          );
        } else {
          pendingRequest.resolve(packet.result ?? {});
        }
        return;
      }

      for (const listener of this.#eventListeners) listener(packet);
    });

    webSocket.addEventListener("close", () => {
      for (const pendingRequest of this.#pending.values()) {
        clearTimeout(pendingRequest.timeout);
        pendingRequest.reject(
          new Error(`CDP foi encerrado durante ${pendingRequest.method}.`),
        );
      }
      this.#pending.clear();
    });
  }

  static async connect(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (typeof WebSocket !== "function") {
      throw new Error("O runtime Node não disponibiliza WebSocket global para o CDP.");
    }

    const webSocket = new WebSocket(url);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        webSocket.close();
        reject(new Error("Timeout ao conectar ao Chrome DevTools Protocol."));
      }, timeoutMs);

      webSocket.addEventListener(
        "open",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
      webSocket.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          reject(new Error("Falha ao conectar ao Chrome DevTools Protocol."));
        },
        { once: true },
      );
    });

    return new CdpClient(webSocket);
  }

  request(
    method,
    params = {},
    sessionId = undefined,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    const id = this.#nextId;
    this.#nextId += 1;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Timeout na chamada CDP ${method}.`));
      }, timeoutMs);

      this.#pending.set(id, { method, resolve, reject, timeout });
      this.#webSocket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  }

  addEventListener(listener) {
    this.#eventListeners.add(listener);
    return () => this.#eventListeners.delete(listener);
  }

  waitForEvent(method, sessionId, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        removeListener();
        reject(new Error(`Timeout aguardando evento CDP ${method}.`));
      }, timeoutMs);

      const removeListener = this.addEventListener((packet) => {
        if (packet.method !== method || packet.sessionId !== sessionId) return;
        clearTimeout(timeout);
        removeListener();
        resolve(packet.params ?? {});
      });
    });
  }

  close() {
    this.#webSocket.close();
  }
}
