export type LoggerConfig = {
  lokiUrl?: string;
  appName: string;
  enabled?: boolean;
  labels?: Record<string, string>;
};

type LogLevel = "debug" | "info" | "warn" | "error";

const globalForLogger = globalThis as typeof globalThis & {
  __maxjanLoggerInitialized?: boolean;
  __maxjanOriginalConsole?: typeof console;
};

let config: LoggerConfig = {
  lokiUrl: "http://127.0.0.1:3100/loki/api/v1/push",
  appName: "app",
  enabled: true,
};

async function sendToLoki(level: LogLevel, args: unknown[]) {
  if (!config.enabled || !config.lokiUrl) return;

  const message = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ");

  const now = new Date();
  const localTime = now.toLocaleString("sv-SE");

  try {
    await fetch(config.lokiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streams: [{
          stream: {
            app: config.appName,
            level,
            ...config.labels,
          },
          values: [[`${Date.now() * 1000000}`, JSON.stringify({
            message,
            level,
            timestamp: localTime,
          })]]
        }]
      }),
    });
  } catch {
    // Silently fail
  }
}

function wrapConsole() {
  if (globalForLogger.__maxjanLoggerInitialized) return;

  globalForLogger.__maxjanLoggerInitialized = true;
  globalForLogger.__maxjanOriginalConsole = { ...console };

  const methods: Record<string, LogLevel> = {
    log: "info",
    info: "info",
    warn: "warn",
    error: "error",
    debug: "debug",
    trace: "debug"
  };

  for (const [method, level] of Object.entries(methods)) {
    const original = globalForLogger.__maxjanOriginalConsole![method as keyof Console];
    if (typeof original === "function") {
      (console as any)[method] = (...args: unknown[]) => {
        (original as Function).apply(console, args);
        sendToLoki(level, args);
      };
    }
  }
}

function unwrapConsole() {
  if (!globalForLogger.__maxjanLoggerInitialized || !globalForLogger.__maxjanOriginalConsole) return;

  const methods = ["log", "info", "warn", "error", "debug", "trace"];
  for (const method of methods) {
    const original = globalForLogger.__maxjanOriginalConsole[method as keyof Console];
    if (typeof original === "function") {
      (console as any)[method] = original;
    }
  }

  globalForLogger.__maxjanLoggerInitialized = false;
}

export function initLogger(userConfig: LoggerConfig) {
  config = { ...config, ...userConfig };

  if (process.env.NODE_ENV === "development" && config.enabled) {
    wrapConsole();
  }
}

export function disableLogger() {
  config.enabled = false;
  unwrapConsole();
}

export function setLabels(labels: Record<string, string>) {
  config.labels = { ...config.labels, ...labels };
}

export default { initLogger, disableLogger, setLabels };
