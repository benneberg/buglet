/**
 * Telemetry System Configuration
 *
 * Centralized configuration for all telemetry components
 */

export interface TelemetrySystemConfig {
  // Bridge configuration
  bridge: {
    dbName: string
    version: number
    sessionStore: string
    dataPointStore: string
  }

  // Blackbox configuration
  blackbox: {
    ringBufferSize: number
    persistInterval: number
    crashDetectionEnabled: boolean
    autoRecover: boolean
    storageKey: string
    heartbeatInterval: number
    crashThreshold: number // ms since last heartbeat to consider crash
  }

  // API configuration
  api: {
    collectEndpoint: string
    sessionsEndpoint: string
    exportEndpoint: string
    timeout: number
    retryAttempts: number
  }

  // Data retention
  retention: {
    maxSessions: number
    maxDataPointsPerSession: number
    maxRecordings: number
    maxCrashReports: number
    sessionTTL: number // Time to live in ms
    dataPointTTL: number // How long to keep individual data points (ms)
    recordingTTL: number // How long to keep blackbox recordings (ms)
    autoCleanupEnabled: boolean // Enable automatic cleanup
    cleanupInterval: number // How often to run cleanup (ms)
  }

  // Performance
  performance: {
    batchSize: number
    flushInterval: number
    enableCompression: boolean
  }

  // Privacy
  privacy: {
    anonymizeIPs: boolean
    excludeUserAgent: boolean
    excludeURL: boolean
    allowedDomains: string[]
  }
}

export const DEFAULT_CONFIG: TelemetrySystemConfig = {
  bridge: {
    dbName: "buglet_telemetry",
    version: 1,
    sessionStore: "sessions",
    dataPointStore: "dataPoints",
  },

  blackbox: {
    ringBufferSize: 1000,
    persistInterval: 5000,
    crashDetectionEnabled: true,
    autoRecover: true,
    storageKey: "blackbox_recordings",
    heartbeatInterval: 5000,
    crashThreshold: 30000,
  },

  api: {
    collectEndpoint: "/api/collect",
    sessionsEndpoint: "/api/sessions",
    exportEndpoint: "/api/export",
    timeout: 10000,
    retryAttempts: 3,
  },

  retention: {
    maxSessions: 100,
    maxDataPointsPerSession: 10000,
    maxRecordings: 50,
    maxCrashReports: 20,
    sessionTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    dataPointTTL: 60 * 60 * 1000, // 1 hour - keeps only last hour of data
    recordingTTL: 24 * 60 * 60 * 1000, // 24 hours - keeps recordings for 1 day
    autoCleanupEnabled: true,
    cleanupInterval: 5 * 60 * 1000, // Run cleanup every 5 minutes
  },

  performance: {
    batchSize: 50,
    flushInterval: 10000,
    enableCompression: false,
  },

  privacy: {
    anonymizeIPs: false,
    excludeUserAgent: false,
    excludeURL: false,
    allowedDomains: [],
  },
}

/**
 * Configuration presets for common scenarios
 */
export const TELEMETRY_PRESETS = {
  // Development environment
  development: {
    ...DEFAULT_CONFIG,
    blackbox: {
      ...DEFAULT_CONFIG.blackbox,
      ringBufferSize: 500,
      persistInterval: 10000,
    },
    retention: {
      ...DEFAULT_CONFIG.retention,
      maxSessions: 20,
      sessionTTL: 24 * 60 * 60 * 1000, // 1 day
    },
  } as TelemetrySystemConfig,

  // Production environment
  production: {
    ...DEFAULT_CONFIG,
    blackbox: {
      ...DEFAULT_CONFIG.blackbox,
      ringBufferSize: 2000,
      persistInterval: 3000,
    },
    retention: {
      ...DEFAULT_CONFIG.retention,
      maxSessions: 200,
      sessionTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    privacy: {
      ...DEFAULT_CONFIG.privacy,
      anonymizeIPs: true,
    },
  } as TelemetrySystemConfig,

  // High-volume environment
  highVolume: {
    ...DEFAULT_CONFIG,
    blackbox: {
      ...DEFAULT_CONFIG.blackbox,
      ringBufferSize: 5000,
      persistInterval: 2000,
    },
    performance: {
      ...DEFAULT_CONFIG.performance,
      batchSize: 100,
      flushInterval: 5000,
      enableCompression: true,
    },
    retention: {
      ...DEFAULT_CONFIG.retention,
      maxSessions: 500,
      maxDataPointsPerSession: 20000,
    },
  } as TelemetrySystemConfig,

  // Privacy-focused
  privacyFocused: {
    ...DEFAULT_CONFIG,
    privacy: {
      anonymizeIPs: true,
      excludeUserAgent: true,
      excludeURL: true,
      allowedDomains: [],
    },
    retention: {
      ...DEFAULT_CONFIG.retention,
      sessionTTL: 24 * 60 * 60 * 1000, // 1 day
    },
  } as TelemetrySystemConfig,

  // Minimal (low overhead)
  minimal: {
    ...DEFAULT_CONFIG,
    blackbox: {
      ...DEFAULT_CONFIG.blackbox,
      ringBufferSize: 200,
      persistInterval: 15000,
    },
    retention: {
      ...DEFAULT_CONFIG.retention,
      maxSessions: 10,
      maxDataPointsPerSession: 1000,
      sessionTTL: 12 * 60 * 60 * 1000, // 12 hours
    },
    performance: {
      ...DEFAULT_CONFIG.performance,
      batchSize: 20,
      flushInterval: 20000,
    },
  } as TelemetrySystemConfig,
}

/**
 * Load configuration from environment or use defaults
 */
export function loadTelemetryConfig(preset?: keyof typeof TELEMETRY_PRESETS): TelemetrySystemConfig {
  // Start with preset or default
  let config = preset ? TELEMETRY_PRESETS[preset] : DEFAULT_CONFIG

  // Override with environment variables if available
  if (typeof process !== "undefined" && process.env) {
    config = {
      ...config,
      api: {
        ...config.api,
        collectEndpoint: process.env.NEXT_PUBLIC_TELEMETRY_COLLECT_ENDPOINT || config.api.collectEndpoint,
        sessionsEndpoint: process.env.NEXT_PUBLIC_TELEMETRY_SESSIONS_ENDPOINT || config.api.sessionsEndpoint,
        exportEndpoint: process.env.NEXT_PUBLIC_TELEMETRY_EXPORT_ENDPOINT || config.api.exportEndpoint,
      },
    }
  }

  return config
}

/**
 * Validate configuration
 */
export function validateConfig(config: TelemetrySystemConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate ring buffer size
  if (config.blackbox.ringBufferSize < 10 || config.blackbox.ringBufferSize > 100000) {
    errors.push("Ring buffer size must be between 10 and 100,000")
  }

  // Validate persist interval
  if (config.blackbox.persistInterval < 1000 || config.blackbox.persistInterval > 60000) {
    errors.push("Persist interval must be between 1,000ms and 60,000ms")
  }

  // Validate retention settings
  if (config.retention.maxSessions < 1) {
    errors.push("Max sessions must be at least 1")
  }

  if (config.retention.sessionTTL < 60000) {
    errors.push("Session TTL must be at least 60,000ms (1 minute)")
  }

  // Validate API endpoints
  if (!config.api.collectEndpoint.startsWith("/")) {
    errors.push("API endpoints must start with /")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Merge partial config with defaults
 */
export function mergeConfig(
  partial: Partial<TelemetrySystemConfig>,
  base: TelemetrySystemConfig = DEFAULT_CONFIG,
): TelemetrySystemConfig {
  return {
    bridge: { ...base.bridge, ...partial.bridge },
    blackbox: { ...base.blackbox, ...partial.blackbox },
    api: { ...base.api, ...partial.api },
    retention: { ...base.retention, ...partial.retention },
    performance: { ...base.performance, ...partial.performance },
    privacy: { ...base.privacy, ...partial.privacy },
  }
}
