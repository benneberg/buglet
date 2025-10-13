/**
 * Error Handler Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals"
import {
  getErrorHandler,
  destroyErrorHandler,
  ErrorCategory,
  ErrorSeverity,
  handleApiError,
  handleNetworkError,
  handleStorageError,
  handleValidationError,
} from "../error-handler"

describe("ErrorHandler", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    destroyErrorHandler()
  })

  afterEach(() => {
    destroyErrorHandler()
  })

  describe("Error Creation", () => {
    it("should create an app error from a standard Error", () => {
      const handler = getErrorHandler()
      const error = new Error("Test error")
      const appError = handler.handle(error)

      expect(appError.message).toBe("Test error")
      expect(appError.id).toMatch(/^err_/)
      expect(appError.timestamp).toBeGreaterThan(0)
      expect(appError.category).toBeDefined()
      expect(appError.severity).toBeDefined()
    })

    it("should create an app error from a string", () => {
      const handler = getErrorHandler()
      const appError = handler.handle("String error")

      expect(appError.message).toBe("String error")
      expect(appError.originalError).toBeInstanceOf(Error)
    })

    it("should accept custom context", () => {
      const handler = getErrorHandler()
      const appError = handler.handle(new Error("Test"), {
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        userMessage: "Custom message",
        additionalContext: { endpoint: "/api/test" },
      })

      expect(appError.category).toBe(ErrorCategory.API)
      expect(appError.severity).toBe(ErrorSeverity.HIGH)
      expect(appError.userMessage).toBe("Custom message")
      expect(appError.context?.endpoint).toBe("/api/test")
    })
  })

  describe("Error Categorization", () => {
    it("should detect network errors", () => {
      const handler = getErrorHandler()
      const error = new Error("Network request failed")
      const appError = handler.handle(error)

      expect(appError.category).toBe(ErrorCategory.NETWORK)
    })

    it("should detect API errors", () => {
      const handler = getErrorHandler()
      const error = new Error("API endpoint returned 500")
      const appError = handler.handle(error)

      expect(appError.category).toBe(ErrorCategory.API)
    })

    it("should detect storage errors", () => {
      const handler = getErrorHandler()
      const error = new Error("Storage quota exceeded")
      const appError = handler.handle(error)

      expect(appError.category).toBe(ErrorCategory.STORAGE)
    })

    it("should detect validation errors", () => {
      const handler = getErrorHandler()
      const error = new Error("Invalid input provided")
      const appError = handler.handle(error)

      expect(appError.category).toBe(ErrorCategory.VALIDATION)
    })
  })

  describe("Severity Detection", () => {
    it("should detect critical errors", () => {
      const handler = getErrorHandler()
      const error = new Error("Critical system failure")
      const appError = handler.handle(error)

      expect(appError.severity).toBe(ErrorSeverity.CRITICAL)
    })

    it("should detect high severity errors", () => {
      const handler = getErrorHandler()
      const error = new Error("Storage quota exceeded")
      const appError = handler.handle(error)

      expect(appError.severity).toBe(ErrorSeverity.HIGH)
    })

    it("should detect medium severity errors", () => {
      const handler = getErrorHandler()
      const error = new Error("Network timeout occurred")
      const appError = handler.handle(error)

      expect(appError.severity).toBe(ErrorSeverity.MEDIUM)
    })
  })

  describe("Specialized Error Handlers", () => {
    it("should handle API errors with endpoint context", () => {
      const appError = handleApiError(new Error("API failed"), "/api/test", { userId: "123" })

      expect(appError.category).toBe(ErrorCategory.API)
      expect(appError.context?.endpoint).toBe("/api/test")
      expect(appError.context?.userId).toBe("123")
    })

    it("should handle network errors with appropriate message", () => {
      const appError = handleNetworkError(new Error("Connection lost"))

      expect(appError.category).toBe(ErrorCategory.NETWORK)
      expect(appError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(appError.userMessage).toContain("Network")
    })

    it("should handle storage errors with operation context", () => {
      const appError = handleStorageError(new Error("Write failed"), "save", { key: "data" })

      expect(appError.category).toBe(ErrorCategory.STORAGE)
      expect(appError.context?.operation).toBe("save")
      expect(appError.context?.key).toBe("data")
    })

    it("should handle validation errors", () => {
      const appError = handleValidationError("Email is required")

      expect(appError.category).toBe(ErrorCategory.VALIDATION)
      expect(appError.severity).toBe(ErrorSeverity.LOW)
      expect(appError.message).toBe("Email is required")
    })
  })

  describe("Error Logging", () => {
    it("should log errors to memory", () => {
      const handler = getErrorHandler()
      handler.handle(new Error("Test 1"))
      handler.handle(new Error("Test 2"))

      const log = handler.getErrorLog()
      expect(log.length).toBe(2)
      expect(log[0].message).toBe("Test 1")
      expect(log[1].message).toBe("Test 2")
    })

    it("should persist errors to localStorage", () => {
      const handler = getErrorHandler()
      handler.handle(new Error("Persisted error"))

      const stored = localStorage.getItem("app_error_log")
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.length).toBe(1)
      expect(parsed[0].message).toBe("Persisted error")
    })

    it("should maintain max log size", () => {
      const handler = getErrorHandler()

      // Add 150 errors (max is 100)
      for (let i = 0; i < 150; i++) {
        handler.handle(new Error(`Error ${i}`))
      }

      const log = handler.getErrorLog()
      expect(log.length).toBe(100)
      expect(log[0].message).toBe("Error 50") // First 50 should be removed
    })
  })

  describe("Error Filtering", () => {
    it("should filter errors by category", () => {
      const handler = getErrorHandler()
      handler.handle(new Error("Network error"), { category: ErrorCategory.NETWORK })
      handler.handle(new Error("API error"), { category: ErrorCategory.API })
      handler.handle(new Error("Another network error"), { category: ErrorCategory.NETWORK })

      const networkErrors = handler.getErrorsByCategory(ErrorCategory.NETWORK)
      expect(networkErrors.length).toBe(2)
    })

    it("should filter errors by severity", () => {
      const handler = getErrorHandler()
      handler.handle(new Error("Low error"), { severity: ErrorSeverity.LOW })
      handler.handle(new Error("Critical error"), { severity: ErrorSeverity.CRITICAL })
      handler.handle(new Error("Another low error"), { severity: ErrorSeverity.LOW })

      const lowErrors = handler.getErrorsBySeverity(ErrorSeverity.LOW)
      expect(lowErrors.length).toBe(2)
    })
  })

  describe("Error Log Management", () => {
    it("should clear error log", () => {
      const handler = getErrorHandler()
      handler.handle(new Error("Test 1"))
      handler.handle(new Error("Test 2"))

      expect(handler.getErrorLog().length).toBe(2)

      handler.clearErrorLog()
      expect(handler.getErrorLog().length).toBe(0)

      const stored = localStorage.getItem("app_error_log")
      expect(JSON.parse(stored!).length).toBe(0)
    })

    it("should export error log as JSON", () => {
      const handler = getErrorHandler()
      handler.handle(new Error("Export test"))

      const exported = handler.exportErrorLog()
      const parsed = JSON.parse(exported)

      expect(parsed.version).toBe("1.0.0")
      expect(parsed.exportTime).toBeGreaterThan(0)
      expect(parsed.errors.length).toBe(1)
      expect(parsed.errors[0].message).toBe("Export test")
    })
  })

  describe("API Error Messages", () => {
    it("should provide user-friendly message for 401 errors", () => {
      const appError = handleApiError(new Error("401 Unauthorized"), "/api/test")
      expect(appError.userMessage).toContain("Authentication")
    })

    it("should provide user-friendly message for 403 errors", () => {
      const appError = handleApiError(new Error("403 Forbidden"), "/api/test")
      expect(appError.userMessage).toContain("Access denied")
    })

    it("should provide user-friendly message for 429 errors", () => {
      const appError = handleApiError(new Error("429 Too Many Requests"), "/api/test")
      expect(appError.userMessage).toContain("Rate limit")
    })

    it("should provide user-friendly message for 500 errors", () => {
      const appError = handleApiError(new Error("500 Internal Server Error"), "/api/test")
      expect(appError.userMessage).toContain("temporarily unavailable")
    })
  })
})
