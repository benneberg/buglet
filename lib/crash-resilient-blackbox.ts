/**
 * Crash-Resilient Blackbox Recorder
 *
 * Implements a ring buffer-based recording system that:
 * - Survives browser crashes and page reloads
 * - Maintains a fixed-size buffer to prevent memory bloat
 * - Detects crashes and preserves pre-crash data
 * - Provides automatic recovery and replay capabilities
 */

import type { TelemetryDataPoint } from "./telemetry-bridge"

export interface BlackboxConfig {
  ringBufferSize: number // Maximum number of data points to keep
  persistInterval: number // How often to persist to storage (ms)
  crashDetectionEnabled: boolean
  autoRecover: boolean
  storageKey: string
}

export interface BlackboxRecording {
  id: string
  sessionId: string
  startTime: number
  endTime?: number
  crashDetected: boolean
  dataPoints: TelemetryDataPoint[]
  ringBufferSize: number
  metadata: {
    snippetId?: string
    description?: string
    tags?: string[]
    userAgent?: string
    url?: string
  }
}

export interface CrashReport {
  id: string
  timestamp: number
  sessionId: string
  recordingId: string
  preCrashData: TelemetryDataPoint[]
  errorInfo?: {
    message: string
    stack?: string
    type: string
  }
  systemState: {
    memory?: any
    performance?: any
    network?: any
  }
}

const DEFAULT_CONFIG: BlackboxConfig = {
  ringBufferSize: 1000,
  persistInterval: 5000, // 5 seconds
  crashDetectionEnabled: true,
  autoRecover: true,
  storageKey: "blackbox_recordings",
}

export class CrashResilientBlackbox {
  private config: BlackboxConfig
  private currentRecording: BlackboxRecording | null = null
  private ringBuffer: TelemetryDataPoint[] = []
  private persistTimer: NodeJS.Timeout | null = null
  private lastHeartbeat: number = Date.now()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<BlackboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initialize()
  }

  private initialize() {
    // Check for crash on startup
    if (this.config.crashDetectionEnabled) {
      this.detectCrash()
    }

    // Set up error handlers
    this.setupErrorHandlers()

    // Start heartbeat monitoring
    this.startHeartbeat()

    // Auto-recover if enabled
    if (this.config.autoRecover) {
      this.recoverLastSession()
    }
  }

  /**
   * Start a new recording session
   */
  startRecording(sessionId: string, metadata?: BlackboxRecording["metadata"]): string {
    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.currentRecording = {
      id: recordingId,
      sessionId,
      startTime: Date.now(),
      crashDetected: false,
      dataPoints: [],
      ringBufferSize: this.config.ringBufferSize,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    }

    this.ringBuffer = []

    // Start periodic persistence
    this.startPersistence()

    // Mark session as active
    this.markSessionActive(recordingId)

    console.log(`[Blackbox] Recording started: ${recordingId}`)
    return recordingId
  }

  /**
   * Record a telemetry data point
   */
  record(dataPoint: TelemetryDataPoint) {
    if (!this.currentRecording) {
      console.warn("[Blackbox] No active recording. Call startRecording() first.")
      return
    }

    // Add to ring buffer
    this.ringBuffer.push(dataPoint)

    // Maintain ring buffer size
    if (this.ringBuffer.length > this.config.ringBufferSize) {
      this.ringBuffer.shift()
    }

    // Update current recording
    this.currentRecording.dataPoints = [...this.ringBuffer]

    // Update heartbeat
    this.lastHeartbeat = Date.now()
  }

  /**
   * Stop the current recording
   */
  stopRecording(): BlackboxRecording | null {
    if (!this.currentRecording) {
      return null
    }

    this.currentRecording.endTime = Date.now()

    // Final persistence
    this.persistRecording()

    // Stop persistence timer
    if (this.persistTimer) {
      clearInterval(this.persistTimer)
      this.persistTimer = null
    }

    // Mark session as inactive
    this.markSessionInactive(this.currentRecording.id)

    const recording = this.currentRecording
    this.currentRecording = null
    this.ringBuffer = []

    console.log(`[Blackbox] Recording stopped: ${recording.id}`)
    return recording
  }

  /**
   * Get the current recording
   */
  getCurrentRecording(): BlackboxRecording | null {
    return this.currentRecording
  }

  /**
   * Get all recordings
   */
  getAllRecordings(): BlackboxRecording[] {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (!stored) return []
      return JSON.parse(stored)
    } catch (error) {
      console.error("[Blackbox] Failed to retrieve recordings:", error)
      return []
    }
  }

  /**
   * Get a specific recording by ID
   */
  getRecording(recordingId: string): BlackboxRecording | null {
    const recordings = this.getAllRecordings()
    return recordings.find((r) => r.id === recordingId) || null
  }

  /**
   * Delete a recording
   */
  deleteRecording(recordingId: string): boolean {
    try {
      const recordings = this.getAllRecordings()
      const filtered = recordings.filter((r) => r.id !== recordingId)
      localStorage.setItem(this.config.storageKey, JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error("[Blackbox] Failed to delete recording:", error)
      return false
    }
  }

  /**
   * Clear all recordings
   */
  clearAllRecordings(olderThanMs?: number): boolean {
    try {
      const recordings = this.getAllRecordings()

      if (olderThanMs) {
        // Only delete recordings older than specified time
        const cutoff = Date.now() - olderThanMs
        const filtered = recordings.filter((r) => r.startTime > cutoff)
        localStorage.setItem(this.config.storageKey, JSON.stringify(filtered))
        console.log(
          `[Blackbox] Cleaned ${recordings.length - filtered.length} recordings older than ${olderThanMs / 1000}s`,
        )
      } else {
        // Delete all
        localStorage.removeItem(this.config.storageKey)
        localStorage.removeItem(`${this.config.storageKey}_active`)
        localStorage.removeItem(`${this.config.storageKey}_crashes`)
      }

      return true
    } catch (error) {
      console.error("[Blackbox] Failed to clear recordings:", error)
      return false
    }
  }

  /**
   * Get crash reports
   */
  getCrashReports(): CrashReport[] {
    try {
      const stored = localStorage.getItem(`${this.config.storageKey}_crashes`)
      if (!stored) return []
      return JSON.parse(stored)
    } catch (error) {
      console.error("[Blackbox] Failed to retrieve crash reports:", error)
      return []
    }
  }

  /**
   * Export recording as JSON
   */
  exportRecording(recordingId: string): string | null {
    const recording = this.getRecording(recordingId)
    if (!recording) return null

    return JSON.stringify(
      {
        version: "1.0.0",
        exportTime: Date.now(),
        recording,
      },
      null,
      2,
    )
  }

  // Private methods

  private startPersistence() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer)
    }

    this.persistTimer = setInterval(() => {
      this.persistRecording()
    }, this.config.persistInterval)
  }

  private persistRecording() {
    if (!this.currentRecording) return

    try {
      const recordings = this.getAllRecordings()
      const existingIndex = recordings.findIndex((r) => r.id === this.currentRecording!.id)

      if (existingIndex >= 0) {
        recordings[existingIndex] = this.currentRecording
      } else {
        recordings.push(this.currentRecording)
      }

      // Keep only last 50 recordings to prevent storage bloat
      const trimmed = recordings.slice(-50)

      localStorage.setItem(this.config.storageKey, JSON.stringify(trimmed))
    } catch (error) {
      console.error("[Blackbox] Failed to persist recording:", error)
    }
  }

  private markSessionActive(recordingId: string) {
    try {
      const active = {
        recordingId,
        timestamp: Date.now(),
        heartbeat: Date.now(),
      }
      localStorage.setItem(`${this.config.storageKey}_active`, JSON.stringify(active))
    } catch (error) {
      console.error("[Blackbox] Failed to mark session active:", error)
    }
  }

  private markSessionInactive(recordingId: string) {
    try {
      localStorage.removeItem(`${this.config.storageKey}_active`)
    } catch (error) {
      console.error("[Blackbox] Failed to mark session inactive:", error)
    }
  }

  private detectCrash() {
    try {
      const activeSession = localStorage.getItem(`${this.config.storageKey}_active`)
      if (!activeSession) return

      const active = JSON.parse(activeSession)
      const timeSinceHeartbeat = Date.now() - active.heartbeat

      // If more than 30 seconds since last heartbeat, assume crash
      if (timeSinceHeartbeat > 30000) {
        console.warn("[Blackbox] Crash detected! Recovering data...")

        const recording = this.getRecording(active.recordingId)
        if (recording) {
          // Mark as crashed
          recording.crashDetected = true
          recording.endTime = active.heartbeat

          // Create crash report
          this.createCrashReport(recording)

          // Update recording
          const recordings = this.getAllRecordings()
          const index = recordings.findIndex((r) => r.id === recording.id)
          if (index >= 0) {
            recordings[index] = recording
            localStorage.setItem(this.config.storageKey, JSON.stringify(recordings))
          }
        }

        // Clear active session
        localStorage.removeItem(`${this.config.storageKey}_active`)
      }
    } catch (error) {
      console.error("[Blackbox] Crash detection failed:", error)
    }
  }

  private createCrashReport(recording: BlackboxRecording) {
    try {
      const crashReport: CrashReport = {
        id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sessionId: recording.sessionId,
        recordingId: recording.id,
        preCrashData: recording.dataPoints.slice(-100), // Last 100 data points
        systemState: {
          memory: this.captureMemoryState(),
          performance: this.capturePerformanceState(),
        },
      }

      const crashes = this.getCrashReports()
      crashes.push(crashReport)

      // Keep only last 20 crash reports
      const trimmed = crashes.slice(-20)

      localStorage.setItem(`${this.config.storageKey}_crashes`, JSON.stringify(trimmed))

      console.log(`[Blackbox] Crash report created: ${crashReport.id}`)
    } catch (error) {
      console.error("[Blackbox] Failed to create crash report:", error)
    }
  }

  private setupErrorHandlers() {
    // Global error handler
    window.addEventListener("error", (event) => {
      if (this.currentRecording) {
        this.record({
          id: `error_${Date.now()}`,
          sessionId: this.currentRecording.sessionId,
          timestamp: Date.now(),
          type: "error",
          data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error?.stack,
          },
          tags: { severity: "error" },
        })
      }
    })

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      if (this.currentRecording) {
        this.record({
          id: `rejection_${Date.now()}`,
          sessionId: this.currentRecording.sessionId,
          timestamp: Date.now(),
          type: "error",
          data: {
            reason: event.reason,
            promise: String(event.promise),
          },
          tags: { severity: "error", type: "unhandled-rejection" },
        })
      }
    })

    // Before unload handler (page close/refresh)
    window.addEventListener("beforeunload", () => {
      if (this.currentRecording) {
        this.persistRecording()
      }
    })
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.currentRecording) {
        try {
          const active = {
            recordingId: this.currentRecording.id,
            timestamp: Date.now(),
            heartbeat: this.lastHeartbeat,
          }
          localStorage.setItem(`${this.config.storageKey}_active`, JSON.stringify(active))
        } catch (error) {
          console.error("[Blackbox] Heartbeat update failed:", error)
        }
      }
    }, 5000) // Update every 5 seconds
  }

  private recoverLastSession() {
    try {
      const recordings = this.getAllRecordings()
      const lastRecording = recordings[recordings.length - 1]

      if (lastRecording && lastRecording.crashDetected) {
        console.log(`[Blackbox] Recovered crashed session: ${lastRecording.id}`)
        console.log(`[Blackbox] Pre-crash data points: ${lastRecording.dataPoints.length}`)

        // Optionally notify user or trigger analysis
        if (typeof window !== "undefined" && "CustomEvent" in window) {
          window.dispatchEvent(
            new CustomEvent("blackbox:crash-recovered", {
              detail: { recording: lastRecording },
            }),
          )
        }
      }
    } catch (error) {
      console.error("[Blackbox] Session recovery failed:", error)
    }
  }

  private captureMemoryState(): any {
    if ("memory" in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      }
    }
    return null
  }

  private capturePerformanceState(): any {
    return {
      navigation: performance.getEntriesByType("navigation")[0],
      timing: performance.timing,
    }
  }

  /**
   * Cleanup and destroy the blackbox instance
   */
  destroy() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer)
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    this.stopRecording()
  }

  /**
   * Automatically cleanup old recordings
   */
  cleanupOldRecordings(retentionMs: number = 24 * 60 * 60 * 1000): number {
    const recordings = this.getAllRecordings()
    const cutoff = Date.now() - retentionMs
    let deleted = 0

    const filtered = recordings.filter((r) => {
      // Keep crashed recordings longer (2x retention)
      if (r.crashDetected && r.startTime > cutoff / 2) {
        return true
      }
      // Keep recent recordings
      if (r.startTime > cutoff) {
        return true
      }
      deleted++
      return false
    })

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(filtered))
      console.log(`[Blackbox] Cleaned up ${deleted} old recordings`)
    } catch (error) {
      console.error("[Blackbox] Cleanup failed:", error)
    }

    return deleted
  }
}

// Singleton instance for global use
let globalBlackbox: CrashResilientBlackbox | null = null

export function getGlobalBlackbox(config?: Partial<BlackboxConfig>): CrashResilientBlackbox {
  if (!globalBlackbox) {
    globalBlackbox = new CrashResilientBlackbox(config)
  }
  return globalBlackbox
}

export function destroyGlobalBlackbox() {
  if (globalBlackbox) {
    globalBlackbox.destroy()
    globalBlackbox = null
  }
}
