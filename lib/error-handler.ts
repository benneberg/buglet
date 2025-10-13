/**
 * Centralized Error Handling Utility
 *
 * Provides consistent error handling, logging, and user notifications
 * across the entire application.
 */

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  NETWORK = "network",
  API = "api",
  STORAGE = "storage",
  VALIDATION = "validation",
  RUNTIME = "runtime",
  INTEGRATION = "integration",
  UNKNOWN = "unknown",
}

export interface AppError {
  id: string
  timestamp: number
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  originalError?: Error
  context?: Record<string, any>
  stack?: string
  userMessage?: string
}

export interface ErrorHandlerConfig {
  enableLogging: boolean
  enableToasts: boolean
  logToConsole: boolean
  sendToMonitoring: boolean
  storageKey: string
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableLogging: true,
  enableToasts: true,
  logToConsole: true,
  sendToMonitoring: false,
  storageKey: "app_error_log",
}

class ErrorHandler {
  private config: ErrorHandlerConfig
  private errorLog: AppError[] = []
  private maxLogSize = 100

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadErrorLog()
  }

  /**
   * Handle an error with automatic categorization and severity detection
   */
  handle(
    error: unknown,
    context?: {
      category?: ErrorCategory
      severity?: ErrorSeverity
      userMessage?: string
      additionalContext?: Record<string, any>
    },
  ): AppError {
    const appError = this.createAppError(error, context)

    // Log the error
    if (this.config.enableLogging) {
      this.logError(appError)
    }

    // Console logging
    if (this.config.logToConsole) {
      this.consoleLog(appError)
    }

    // Send to monitoring service (Sentry, etc.)
    if (this.config.sendToMonitoring) {
      this.sendToMonitoring(appError)
    }

    return appError
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(error: unknown, endpoint: string, context?: Record<string, any>): AppError {
    return this.handle(error, {
      category: ErrorCategory.API,
      severity: this.detectApiErrorSeverity(error),
      userMessage: this.getApiErrorMessage(error),
      additionalContext: { endpoint, ...context },
    })
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: unknown, context?: Record<string, any>): AppError {
    return this.handle(error, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      userMessage: "Network connection issue. Please check your internet connection.",
      additionalContext: context,
    })
  }

  /**
   * Handle storage errors (localStorage, IndexedDB)
   */
  handleStorageError(error: unknown, operation: string, context?: Record<string, any>): AppError {
    return this.handle(error, {
      category: ErrorCategory.STORAGE,
      severity: ErrorSeverity.MEDIUM,
      userMessage: "Failed to save data. Your browser storage might be full.",
      additionalContext: { operation, ...context },
    })
  }

  /**
   * Handle validation errors
   */
  handleValidationError(message: string, context?: Record<string, any>): AppError {
    return this.handle(new Error(message), {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      userMessage: message,
      additionalContext: context,
    })
  }

  /**
   * Get all logged errors
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorLog.filter((e) => e.category === category)
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorLog.filter((e) => e.severity === severity)
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = []
    this.saveErrorLog()
  }

  /**
   * Export error log as JSON
   */
  exportErrorLog(): string {
    return JSON.stringify(
      {
        version: "1.0.0",
        exportTime: Date.now(),
        errors: this.errorLog,
      },
      null,
      2,
    )
  }

  // Private methods

  private createAppError(
    error: unknown,
    context?: {
      category?: ErrorCategory
      severity?: ErrorSeverity
      userMessage?: string
      additionalContext?: Record<string, any>
    },
  ): AppError {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    return {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message: errorObj.message,
      category: context?.category || this.detectCategory(errorObj),
      severity: context?.severity || this.detectSeverity(errorObj),
      originalError: errorObj,
      context: context?.additionalContext,
      stack: errorObj.stack,
      userMessage: context?.userMessage || this.getUserFriendlyMessage(errorObj),
    }
  }

  private detectCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase()

    if (message.includes("network") || message.includes("fetch")) {
      return ErrorCategory.NETWORK
    }
    if (message.includes("api") || message.includes("endpoint")) {
      return ErrorCategory.API
    }
    if (message.includes("storage") || message.includes("quota")) {
      return ErrorCategory.STORAGE
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorCategory.VALIDATION
    }
    if (message.includes("integration") || message.includes("groq") || message.includes("openai")) {
      return ErrorCategory.INTEGRATION
    }

    return ErrorCategory.RUNTIME
  }

  private detectSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase()

    if (message.includes("critical") || message.includes("fatal")) {
      return ErrorSeverity.CRITICAL
    }
    if (message.includes("quota") || message.includes("storage full")) {
      return ErrorSeverity.HIGH
    }
    if (message.includes("network") || message.includes("timeout")) {
      return ErrorSeverity.MEDIUM
    }

    return ErrorSeverity.LOW
  }

  private detectApiErrorSeverity(error: unknown): ErrorSeverity {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes("401") || message.includes("403")) {
        return ErrorSeverity.HIGH
      }
      if (message.includes("500") || message.includes("503")) {
        return ErrorSeverity.CRITICAL
      }
      if (message.includes("429")) {
        return ErrorSeverity.MEDIUM
      }
    }
    return ErrorSeverity.MEDIUM
  }

  private getApiErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes("401")) {
        return "Authentication failed. Please check your API key."
      }
      if (message.includes("403")) {
        return "Access denied. You don't have permission for this action."
      }
      if (message.includes("429")) {
        return "Rate limit exceeded. Please try again later."
      }
      if (message.includes("500") || message.includes("503")) {
        return "Service temporarily unavailable. Please try again."
      }
    }
    return "An error occurred while communicating with the server."
  }

  private getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes("network")) {
      return "Network connection issue. Please check your internet."
    }
    if (message.includes("quota") || message.includes("storage")) {
      return "Storage limit reached. Please clear some data."
    }
    if (message.includes("timeout")) {
      return "Request timed out. Please try again."
    }

    return "An unexpected error occurred. Please try again."
  }

  private logError(error: AppError): void {
    this.errorLog.push(error)

    // Maintain max log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift()
    }

    this.saveErrorLog()
  }

  private consoleLog(error: AppError): void {
    const style = this.getConsoleStyle(error.severity)

    console.group(`%c[Error] ${error.category.toUpperCase()}`, style)
    console.log("Message:", error.message)
    console.log("Severity:", error.severity)
    console.log("Timestamp:", new Date(error.timestamp).toISOString())
    if (error.context) {
      console.log("Context:", error.context)
    }
    if (error.stack) {
      console.log("Stack:", error.stack)
    }
    console.groupEnd()
  }

  private getConsoleStyle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "color: white; background-color: #dc2626; font-weight: bold; padding: 2px 6px; border-radius: 3px;"
      case ErrorSeverity.HIGH:
        return "color: white; background-color: #ea580c; font-weight: bold; padding: 2px 6px; border-radius: 3px;"
      case ErrorSeverity.MEDIUM:
        return "color: white; background-color: #f59e0b; font-weight: bold; padding: 2px 6px; border-radius: 3px;"
      case ErrorSeverity.LOW:
        return "color: white; background-color: #3b82f6; font-weight: bold; padding: 2px 6px; border-radius: 3px;"
    }
  }

  private sendToMonitoring(error: AppError): void {
    // TODO: Integrate with Sentry, LogRocket, or other monitoring service
    // Example:
    // Sentry.captureException(error.originalError, {
    //   tags: {
    //     category: error.category,
    //     severity: error.severity,
    //   },
    //   extra: error.context,
    // })
  }

  private loadErrorLog(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        this.errorLog = JSON.parse(stored)
      }
    } catch (error) {
      console.error("[ErrorHandler] Failed to load error log:", error)
    }
  }

  private saveErrorLog(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.errorLog))
    } catch (error) {
      console.error("[ErrorHandler] Failed to save error log:", error)
    }
  }
}

// Singleton instance
let globalErrorHandler: ErrorHandler | null = null

export function getErrorHandler(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler(config)
  }
  return globalErrorHandler
}

export function destroyErrorHandler(): void {
  globalErrorHandler = null
}

// Convenience functions
export function handleError(error: unknown, context?: Record<string, any>): AppError {
  return getErrorHandler().handle(error, context)
}

export function handleApiError(error: unknown, endpoint: string, context?: Record<string, any>): AppError {
  return getErrorHandler().handleApiError(error, endpoint, context)
}

export function handleNetworkError(error: unknown, context?: Record<string, any>): AppError {
  return getErrorHandler().handleNetworkError(error, context)
}

export function handleStorageError(error: unknown, operation: string, context?: Record<string, any>): AppError {
  return getErrorHandler().handleStorageError(error, operation, context)
}

export function handleValidationError(message: string, context?: Record<string, any>): AppError {
  return getErrorHandler().handleValidationError(message, context)
}
