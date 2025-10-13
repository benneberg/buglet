/**
 * Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals"
import { getLogger, destroyLogger, LogLevel, debug, info, warn, error, fatal } from "../logger"

describe("Logger", () => {
  beforeEach(() => {
    localStorage.clear()
    destroyLogger()
  })

  afterEach(() => {
    destroyLogger()
  })

  describe("Basic Logging", () => {
    it("should log debug messages", () => {
      const logger = getLogger({ minLevel: LogLevel.DEBUG })
      logger.debug("Debug message", { key: "value" })

      const logs = logger.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].level).toBe(LogLevel.DEBUG)
      expect(logs[0].message).toBe("Debug message")
      expect(logs[0].context?.key).toBe("value")
    })

    it("should log info messages", () => {
      const logger = getLogger()
      logger.info("Info message")

      const logs = logger.getLogs()
      expect(logs[0].level).toBe(LogLevel.INFO)
      expect(logs[0].message).toBe("Info message")
    })

    it("should log warning messages", () => {
      const logger = getLogger()
      logger.warn("Warning message")

      const logs = logger.getLogs()
      expect(logs[0].level).toBe(LogLevel.WARN)
      expect(logs[0].message).toBe("Warning message")
    })

    it("should log error messages", () => {
      const logger = getLogger()
      const testError = new Error("Test error")
      logger.error("Error occurred", testError)

      const logs = logger.getLogs()
      expect(logs[0].level).toBe(LogLevel.ERROR)
      expect(logs[0].message).toBe("Error occurred")
      expect(logs[0].context?.error.message).toBe("Test error")
    })

    it("should log fatal messages", () => {
      const logger = getLogger()
      logger.fatal("Fatal error")

      const logs = logger.getLogs()
      expect(logs[0].level).toBe(LogLevel.FATAL)
      expect(logs[0].message).toBe("Fatal error")
    })
  })

  describe("Log Levels", () => {
    it("should respect minimum log level", () => {
      const logger = getLogger({ minLevel: LogLevel.WARN })

      logger.debug("Debug message")
      logger.info("Info message")
      logger.warn("Warning message")
      logger.error("Error message")

      const logs = logger.getLogs()
      expect(logs.length).toBe(2) // Only warn and error
      expect(logs[0].level).toBe(LogLevel.WARN)
      expect(logs[1].level).toBe(LogLevel.ERROR)
    })

    it("should log all levels when set to DEBUG", () => {
      const logger = getLogger({ minLevel: LogLevel.DEBUG })

      logger.debug("Debug")
      logger.info("Info")
      logger.warn("Warn")
      logger.error("Error")

      const logs = logger.getLogs()
      expect(logs.length).toBe(4)
    })
  })

  describe("Context and Tags", () => {
    it("should include context in logs", () => {
      const logger = getLogger()
      logger.info("Message", { userId: "123", action: "login" })

      const logs = logger.getLogs()
      expect(logs[0].context?.userId).toBe("123")
      expect(logs[0].context?.action).toBe("login")
    })

    it("should include tags in logs", () => {
      const logger = getLogger()
      logger.info("Message", {}, ["auth", "security"])

      const logs = logger.getLogs()
      expect(logs[0].tags).toContain("auth")
      expect(logs[0].tags).toContain("security")
    })

    it("should include default tags", () => {
      const logger = getLogger({ defaultTags: ["app", "production"] })
      logger.info("Message")

      const logs = logger.getLogs()
      expect(logs[0].tags).toContain("app")
      expect(logs[0].tags).toContain("production")
    })

    it("should merge default and custom tags", () => {
      const logger = getLogger({ defaultTags: ["app"] })
      logger.info("Message", {}, ["custom"])

      const logs = logger.getLogs()
      expect(logs[0].tags).toContain("app")
      expect(logs[0].tags).toContain("custom")
    })
  })

  describe("Session and User Tracking", () => {
    it("should include session ID in logs", () => {
      const logger = getLogger()
      logger.setSessionId("session_123")
      logger.info("Message")

      const logs = logger.getLogs()
      expect(logs[0].sessionId).toBe("session_123")
    })

    it("should include user ID in logs", () => {
      const logger = getLogger()
      logger.setUserId("user_456")
      logger.info("Message")

      const logs = logger.getLogs()
      expect(logs[0].userId).toBe("user_456")
    })
  })

  describe("Child Loggers", () => {
    it("should create child logger with source", () => {
      const logger = getLogger()
      const child = logger.child("AuthService")
      child.info("Login successful")

      const logs = logger.getLogs()
      expect(logs[0].source).toBe("AuthService")
    })

    it("should inherit context in child logger", () => {
      const logger = getLogger()
      const child = logger.child("API", { service: "auth" })
      child.info("Request", { endpoint: "/login" })

      const logs = logger.getLogs()
      expect(logs[0].context?.service).toBe("auth")
      expect(logs[0].context?.endpoint).toBe("/login")
    })

    it("should inherit tags in child logger", () => {
      const logger = getLogger()
      const child = logger.child("API", {}, ["http"])
      child.info("Request", {}, ["post"])

      const logs = logger.getLogs()
      expect(logs[0].tags).toContain("http")
      expect(logs[0].tags).toContain("post")
    })
  })

  describe("Log Filtering", () => {
    it("should filter logs by level", () => {
      const logger = getLogger()
      logger.info("Info 1")
      logger.warn("Warn 1")
      logger.info("Info 2")

      const filtered = logger.getLogs({ level: LogLevel.INFO })
      expect(filtered.length).toBe(2)
      expect(filtered.every((log) => log.level === LogLevel.INFO)).toBe(true)
    })

    it("should filter logs by source", () => {
      const logger = getLogger()
      const child1 = logger.child("Service1")
      const child2 = logger.child("Service2")

      child1.info("Message 1")
      child2.info("Message 2")
      child1.info("Message 3")

      const filtered = logger.getLogs({ source: "Service1" })
      expect(filtered.length).toBe(2)
    })

    it("should filter logs by tags", () => {
      const logger = getLogger()
      logger.info("Message 1", {}, ["auth"])
      logger.info("Message 2", {}, ["api"])
      logger.info("Message 3", {}, ["auth", "api"])

      const filtered = logger.getLogs({ tags: ["auth"] })
      expect(filtered.length).toBe(2)
    })

    it("should filter logs by time range", () => {
      const logger = getLogger()
      const now = Date.now()

      logger.info("Old message")

      // Simulate time passing
      const logs = logger.getLogs()
      logs[0].timestamp = now - 10000

      logger.info("New message")

      const filtered = logger.getLogs({ startTime: now - 5000 })
      expect(filtered.length).toBe(1)
      expect(filtered[0].message).toBe("New message")
    })
  })

  describe("Storage", () => {
    it("should persist logs to localStorage", () => {
      const logger = getLogger({ enableStorage: true })
      logger.info("Persisted message")
      logger.flush()

      const stored = localStorage.getItem("app_logs")
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.length).toBe(1)
      expect(parsed[0].message).toBe("Persisted message")
    })

    it("should load logs from localStorage", () => {
      const logger1 = getLogger()
      logger1.info("Message 1")
      logger1.flush()
      destroyLogger()

      const logger2 = getLogger()
      const logs = logger2.getLogs()
      expect(logs.length).toBe(1)
      expect(logs[0].message).toBe("Message 1")
    })

    it("should maintain max log buffer size", () => {
      const logger = getLogger({ maxStoredLogs: 10 })

      for (let i = 0; i < 15; i++) {
        logger.info(`Message ${i}`)
      }

      const logs = logger.getLogs()
      expect(logs.length).toBe(10)
      expect(logs[0].message).toBe("Message 5")
    })
  })

  describe("Export", () => {
    it("should export logs as JSON", () => {
      const logger = getLogger()
      logger.info("Export test")

      const exported = logger.exportLogs()
      const parsed = JSON.parse(exported)

      expect(parsed.version).toBe("1.0.0")
      expect(parsed.count).toBe(1)
      expect(parsed.logs[0].message).toBe("Export test")
    })

    it("should export filtered logs", () => {
      const logger = getLogger()
      logger.info("Info message")
      logger.warn("Warn message")

      const exported = logger.exportLogs({ level: LogLevel.WARN })
      const parsed = JSON.parse(exported)

      expect(parsed.count).toBe(1)
      expect(parsed.logs[0].level).toBe(LogLevel.WARN)
    })
  })

  describe("Convenience Functions", () => {
    it("should use global logger for convenience functions", () => {
      debug("Debug")
      info("Info")
      warn("Warn")
      error("Error", new Error("Test"))
      fatal("Fatal")

      const logger = getLogger()
      const logs = logger.getLogs()
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  describe("Cleanup", () => {
    it("should clear all logs", () => {
      const logger = getLogger()
      logger.info("Message 1")
      logger.info("Message 2")

      expect(logger.getLogs().length).toBe(2)

      logger.clearLogs()
      expect(logger.getLogs().length).toBe(0)
    })
  })
})
