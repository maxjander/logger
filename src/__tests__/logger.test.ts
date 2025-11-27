import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn(() => Promise.resolve());
vi.stubGlobal("fetch", mockFetch);

// Store original console
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  trace: console.trace,
};

describe("@maxjan/logger", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockFetch.mockClear();

    // Reset global state
    (globalThis as any).__maxjanLoggerInitialized = false;
    (globalThis as any).__maxjanOriginalConsole = undefined;

    // Restore original console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    console.trace = originalConsole.trace;

    // Clear module cache to get fresh imports
    vi.resetModules();
  });

  afterEach(async () => {
    // Import fresh and disable
    const { disableLogger } = await import("../index");
    disableLogger();
  });

  describe("initLogger", () => {
    it("should wrap console methods in development", async () => {
      const originalLog = console.log;
      const { initLogger } = await import("../index");

      initLogger({ appName: "test-app" });

      expect(console.log).not.toBe(originalLog);
    });

    it("should not wrap console in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const originalLog = console.log;
      const { initLogger } = await import("../index");

      initLogger({ appName: "test-app" });

      expect(console.log).toBe(originalLog);
    });

    it("should not wrap console when disabled", async () => {
      const originalLog = console.log;
      const { initLogger } = await import("../index");

      initLogger({ appName: "test-app", enabled: false });

      expect(console.log).toBe(originalLog);
    });

    it("should only initialize once", async () => {
      const { initLogger } = await import("../index");

      initLogger({ appName: "test-app" });
      const wrappedLog = console.log;

      initLogger({ appName: "test-app-2" });

      expect(console.log).toBe(wrappedLog);
    });
  });

  describe("console methods", () => {
    it("should send log to Loki", async () => {
      const { initLogger } = await import("../index");
      initLogger({ appName: "test-app" });

      console.log("test message");

      // Wait for async fetch
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://127.0.0.1:3100/loki/api/v1/push");

      const body = JSON.parse(options.body);
      expect(body.streams[0].stream.app).toBe("test-app");
      expect(body.streams[0].stream.level).toBe("info");
    });

    it("should map console.error to error level", async () => {
      const { initLogger } = await import("../index");
      initLogger({ appName: "test-app" });

      console.error("error message");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.streams[0].stream.level).toBe("error");
    });

    it("should map console.warn to warn level", async () => {
      const { initLogger } = await import("../index");
      initLogger({ appName: "test-app" });

      console.warn("warning message");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.streams[0].stream.level).toBe("warn");
    });

    it("should map console.debug to debug level", async () => {
      const { initLogger } = await import("../index");
      initLogger({ appName: "test-app" });

      console.debug("debug message");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.streams[0].stream.level).toBe("debug");
    });

    it("should stringify objects in message", async () => {
      const { initLogger } = await import("../index");
      initLogger({ appName: "test-app" });

      console.log("user:", { id: 123, name: "test" });
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const logData = JSON.parse(body.streams[0].values[0][1]);
      expect(logData.message).toContain('{"id":123,"name":"test"}');
    });
  });

  describe("disableLogger", () => {
    it("should restore original console methods", async () => {
      const originalLog = console.log;
      const { initLogger, disableLogger } = await import("../index");

      initLogger({ appName: "test-app" });
      expect(console.log).not.toBe(originalLog);

      disableLogger();
      expect(console.log).toBe(originalLog);
    });

    it("should stop sending to Loki", async () => {
      const { initLogger, disableLogger } = await import("../index");
      initLogger({ appName: "test-app" });
      disableLogger();

      console.log("test message");
      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("setLabels", () => {
    it("should add labels to log stream", async () => {
      const { initLogger, setLabels } = await import("../index");
      initLogger({ appName: "test-app" });
      setLabels({ userId: "123", requestId: "abc" });

      console.log("test");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.streams[0].stream.userId).toBe("123");
      expect(body.streams[0].stream.requestId).toBe("abc");
    });

    it("should merge with existing labels", async () => {
      const { initLogger, setLabels } = await import("../index");
      initLogger({ appName: "test-app", labels: { env: "test" } });
      setLabels({ userId: "123" });

      console.log("test");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.streams[0].stream.env).toBe("test");
      expect(body.streams[0].stream.userId).toBe("123");
    });
  });

  describe("config options", () => {
    it("should use custom lokiUrl", async () => {
      const { initLogger } = await import("../index");
      initLogger({
        appName: "test-app",
        lokiUrl: "http://custom-loki:3100/loki/api/v1/push",
      });

      console.log("test");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("http://custom-loki:3100/loki/api/v1/push");
    });

    it("should use custom locale for timestamp", async () => {
      const { initLogger } = await import("../index");
      initLogger({ appName: "test-app", locale: "en-US" });

      console.log("test");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const logData = JSON.parse(body.streams[0].values[0][1]);
      expect(logData.timestamp).toBeDefined();
    });
  });
});
