/**
 * Structured Logging System
 *
 * Provides consistent, structured logging with multiple log levels,
 * context enrichment, and integration with monitoring services.
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  context?: Record<string, any>
  tags?: string[]
  source?: string
  sessionId?: string
  userId?: string
  stack?: string
}

export interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableStorage: boolean
  enableRemote: boolean
  storageKey: string
  maxStoredLogs: number
  remoteEndpoint?: string
  sessionId?: string
  userId?: string
  defaultTags?: string[]
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4,
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  storageKey: "app_logs",
  maxStoredLogs: 500,
  defaultTags: [],
}

class Logger {
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadLogs()
    this.startAutoFlush()
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, message, context, tags)
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, message, context, tags)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, message, context, tags)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>, tags?: string[]): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : String(error),
    }
    this.log(LogLevel.ERROR, message, errorContext, tags, error instanceof Error ? error.stack : undefined)
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, error?: Error | unknown, context?: Record<string, any>, tags?: string[]): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : String(error),
    }
    this.log(LogLevel.FATAL, message, errorContext, tags, error instanceof Error ? error.stack : undefined)
  }

  /**
   * Create a child logger with additional context
   */
  child(source: string, additionalContext?: Record<string, any>, additionalTags?: string[]): ChildLogger {
    return new ChildLogger(this, source, additionalContext, additionalTags)
  }

  /**
   * Get all logs
   */
  getLogs(filters?: {
    level?: LogLevel
    source?: string
    tags?: string[]
    startTime?: number
    endTime?: number
  }): LogEntry[] {
    let logs = [...this.logBuffer]

    if (filters) {
      if (filters.level) {
        logs = logs.filter((log) => log.level === filters.level)
      }
      if (filters.source) {
        logs = logs.filter((log) => log.source === filters.source)
      }
      if (filters.tags && filters.tags.length > 0) {
        logs = logs.filter((log) => filters.tags!.some((tag) => log.tags?.includes(tag)))
      }
      if (filters.startTime) {
        logs = logs.filter((log) => log.timestamp >= filters.startTime!)
      }
      if (filters.endTime) {
        logs = logs.filter((log) => log.timestamp <= filters.endTime!)
      }
    }

    return logs
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logBuffer = []
    this.saveLogs()
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filters?: Parameters<typeof this.getLogs>[0]): string {
    const logs = filters ? this.getLogs(filters) : this.logBuffer
    return JSON.stringify(
      {
        version: "1.0.0",
        exportTime: Date.now(),
        count: logs.length,
        logs,
      },
      null,
      2,
    )
  }

  /**
   * Set session ID for all future logs
   */
  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId
  }

  /**
   * Set user ID for all future logs
   */
  setUserId(userId: string): void {
    this.config.userId = userId
  }

  /**
   * Flush logs to storage and remote endpoint
   */
  flush(): void {
    this.saveLogs()
    if (this.config.enableRemote) {
      this.sendToRemote()
    }
  }

  /**
   * Destroy logger and cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
  }

  // Private methods

  private log(level: LogLevel, message: string, context?: Record<string, any>, tags?: string[], stack?: string): void {
    // Check if log level meets minimum threshold
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) {
      return
    }

    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      context,
      tags: [...(this.config.defaultTags || []), ...(tags || [])],
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      stack,
    }

    // Add to buffer
    this.logBuffer.push(entry)

    // Maintain max buffer size
    if (this.logBuffer.length > this.config.maxStoredLogs) {
      this.logBuffer.shift()
    }

    // Console output
    if (this.config.enableConsole) {
      this.consoleLog(entry)
    }

    // Immediate flush for errors and fatal
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.flush()
    }
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]${entry.source ? ` [${entry.source}]` : ""}`

    const style = this.getConsoleStyle(entry.level)

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix}`, style, entry.message, entry.context || "")
        break
      case LogLevel.INFO:
        console.info(`%c${prefix}`, style, entry.message, entry.context || "")
        break
      case LogLevel.WARN:
        console.warn(`%c${prefix}`, style, entry.message, entry.context || "")
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`%c${prefix}`, style, entry.message, entry.context || "")
        if (entry.stack) {
          console.error(entry.stack)
        }
        break
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "color: #6b7280; font-weight: normal;"
      case LogLevel.INFO:
        return "color: #3b82f6; font-weight: normal;"
      case LogLevel.WARN:
        return "color: #f59e0b; font-weight: bold;"
      case LogLevel.ERROR:
        return "color: #ef4444; font-weight: bold;"
      case LogLevel.FATAL:
        return "color: white; background-color: #dc2626; font-weight: bold; padding: 2px 6px;"
    }
  }

  private loadLogs(): void {
    if (!this.config.enableStorage) return

    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        this.logBuffer = JSON.parse(stored)
      }
    } catch (error) {
      console.error("[Logger] Failed to load logs:", error)
    }
  }

  private saveLogs(): void {
    if (!this.config.enableStorage) return

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.logBuffer))
    } catch (error) {
      console.error("[Logger] Failed to save logs:", error)
    }
  }

  private async sendToRemote(): Promise<void> {
    if (!this.config.remoteEndpoint || this.logBuffer.length === 0) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logs: this.logBuffer,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.error("[Logger] Failed to send logs to remote:", error)
    }
  }

  private startAutoFlush(): void {
    // Auto-flush every 30 seconds
    this.flushTimer = setInterval(() => {
      this.flush()
    }, 30000)
  }
}

/**
 * Child logger with inherited context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private source: string,
    private additionalContext?: Record<string, any>,
    private additionalTags?: string[],
  ) {}

  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.parent.debug(message, { ...this.additionalContext, ...context }, [
      ...(this.additionalTags || []),
      ...(tags || []),
    ])
  }

  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.parent.info(message, { ...this.additionalContext, ...context }, [
      ...(this.additionalTags || []),
      ...(tags || []),
    ])
  }

  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.parent.warn(message, { ...this.additionalContext, ...context }, [
      ...(this.additionalTags || []),
      ...(tags || []),
    ])
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>, tags?: string[]): void {
    this.parent.error(message, error, { ...this.additionalContext, ...context }, [
      ...(this.additionalTags || []),
      ...(tags || []),
    ])
  }

  fatal(message: string, error?: Error | unknown, context?: Record<string, any>, tags?: string[]): void {
    this.parent.fatal(message, error, { ...this.additionalContext, ...context }, [
      ...(this.additionalTags || []),
      ...(tags || []),
    ])
  }
}

// Singleton instance
let globalLogger: Logger | null = null

export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config)
  }
  return globalLogger
}

export function destroyLogger(): void {
  if (globalLogger) {
    globalLogger.destroy()
    globalLogger = null
  }
}

// Convenience functions
export function debug(message: string, context?: Record<string, any>, tags?: string[]): void {
  getLogger().debug(message, context, tags)
}

export function info(message: string, context?: Record<string, any>, tags?: string[]): void {
  getLogger().info(message, context, tags)
}

export function warn(message: string, context?: Record<string, any>, tags?: string[]): void {
  getLogger().warn(message, context, tags)
}

export function error(message: string, err?: Error | unknown, context?: Record<string, any>, tags?: string[]): void {
  getLogger().error(message, err, context, tags)
}

export function fatal(message: string, err?: Error | unknown, context?: Record<string, any>, tags?: string[]): void {
  getLogger().fatal(message, err, context, tags)
}
