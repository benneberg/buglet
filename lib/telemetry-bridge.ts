/**
 * Telemetry Data Bridge
 * Handles collection, storage, and retrieval of telemetry data
 * Supports offline-first architecture with IndexedDB
 */

// IndexedDB configuration
const DB_NAME = "buglet_telemetry"
const DB_VERSION = 1
const STORE_SESSIONS = "sessions"
const STORE_DATAPOINTS = "datapoints"
const STORE_RECORDINGS = "recordings"

// Ring buffer configuration
const DEFAULT_RING_BUFFER_SIZE = 1000
const MAX_RING_BUFFER_SIZE = 10000

/**
 * Initialize IndexedDB for telemetry storage
 */
async function initTelemetryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Sessions store
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: "id" })
        sessionStore.createIndex("startTime", "startTime", { unique: false })
        sessionStore.createIndex("snippetId", "snippetId", { unique: false })
      }

      // Data points store
      if (!db.objectStoreNames.contains(STORE_DATAPOINTS)) {
        const dataStore = db.createObjectStore(STORE_DATAPOINTS, { keyPath: "id" })
        dataStore.createIndex("sessionId", "sessionId", { unique: false })
        dataStore.createIndex("timestamp", "timestamp", { unique: false })
        dataStore.createIndex("type", "type", { unique: false })
        dataStore.createIndex("sessionId_timestamp", ["sessionId", "timestamp"], { unique: false })
      }

      // Recordings store (blackbox recordings)
      if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
        const recordingStore = db.createObjectStore(STORE_RECORDINGS, { keyPath: "id" })
        recordingStore.createIndex("sessionId", "sessionId", { unique: false })
        recordingStore.createIndex("startTime", "startTime", { unique: false })
        recordingStore.createIndex("crashDetected", "crashDetected", { unique: false })
      }
    }
  })
}

/**
 * TelemetryBridge class - Main interface for telemetry operations
 */
export class TelemetryBridge {
  private db: IDBDatabase | null = null
  private currentSessionId: string | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private config: any

  constructor(config?: any) {
    this.config = config || {
      dataPointTTL: 60 * 60 * 1000, // 1 hour default
      recordingTTL: 24 * 60 * 60 * 1000, // 24 hours default
      sessionTTL: 7 * 24 * 60 * 60 * 1000, // 7 days default
      autoCleanupEnabled: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
    }
    this.initDB()
    if (this.config.autoCleanupEnabled) {
      this.startAutoCleanup()
    }
  }

  private async initDB() {
    this.db = await initTelemetryDB()
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await initTelemetryDB()
    }
    return this.db
  }

  /**
   * Create a new telemetry session
   */
  async createSession(
    deviceInfo?: {
      userAgent?: string
      platform?: string
      screenResolution?: string
      viewport?: string
    },
    appInfo?: {
      url?: string
      version?: string
      environment?: string
    },
    snippetId?: string,
  ): Promise<any> {
    const session = await createSession(snippetId)
    this.currentSessionId = session.id
    return session
  }

  /**
   * Record a telemetry data point
   */
  async recordDataPoint(dataPoint: {
    id: string
    sessionId: string
    timestamp: number
    type: string
    data: any
    tags?: Record<string, string>
  }): Promise<void> {
    await storeTelemetryData(dataPoint.sessionId, dataPoint.type, dataPoint.data, dataPoint.tags)
  }

  /**
   * Get data points for a session with optional filters
   */
  async getDataPoints(
    sessionId: string,
    filter?: {
      types?: string[]
      startTime?: number
      endTime?: number
      tags?: Record<string, string>
    },
  ): Promise<any[]> {
    return queryTelemetryData({
      sessionIds: [sessionId],
      types: filter?.types,
      startTime: filter?.startTime,
      endTime: filter?.endTime,
      tags: filter?.tags,
    })
  }

  /**
   * Search data points by text
   */
  async searchDataPoints(sessionId: string, searchText: string): Promise<any[]> {
    const allDataPoints = await this.getDataPoints(sessionId)
    const searchLower = searchText.toLowerCase()

    return allDataPoints.filter((dp) => {
      const dataStr = JSON.stringify(dp.data).toLowerCase()
      const typeStr = dp.type.toLowerCase()
      return dataStr.includes(searchLower) || typeStr.includes(searchLower)
    })
  }

  /**
   * Get all sessions
   */
  async getSessions(): Promise<any[]> {
    return getAllSessions()
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    // Session ending is implicit - no specific action needed
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null
    }
  }

  /**
   * Export session data
   */
  async exportSessionData(sessionId: string): Promise<any> {
    const jsonStr = await exportSessionData(sessionId)
    return JSON.parse(jsonStr)
  }

  /**
   * Clear a session and its data
   */
  async clearSession(sessionId: string): Promise<void> {
    await this.ensureDB()

    // Delete data points
    const dataPoints = await this.getDataPoints(sessionId)
    const db = await this.ensureDB()
    const transaction = db.transaction([STORE_DATAPOINTS], "readwrite")
    const store = transaction.objectStore(STORE_DATAPOINTS)

    for (const dp of dataPoints) {
      store.delete(dp.id)
    }

    // Delete session
    const sessionTransaction = db.transaction([STORE_SESSIONS], "readwrite")
    const sessionStore = sessionTransaction.objectStore(STORE_SESSIONS)
    sessionStore.delete(sessionId)
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  private startAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(async () => {
      console.log("[TelemetryBridge] Running automatic cleanup...")
      await this.cleanupOldData()
    }, this.config.cleanupInterval)

    console.log(
      `[TelemetryBridge] Auto-cleanup enabled (interval: ${this.config.cleanupInterval / 1000}s, data TTL: ${this.config.dataPointTTL / 1000}s)`,
    )
  }

  async cleanupOldData(): Promise<{
    deletedDataPoints: number
    deletedSessions: number
    deletedRecordings: number
  }> {
    const db = await this.ensureDB()
    const now = Date.now()
    const dataPointCutoff = now - this.config.dataPointTTL
    const recordingCutoff = now - this.config.recordingTTL
    const sessionCutoff = now - (this.config.sessionTTL || 7 * 24 * 60 * 60 * 1000)

    let deletedDataPoints = 0
    let deletedSessions = 0
    let deletedRecordings = 0

    // Clean old data points
    const dataTransaction = db.transaction([STORE_DATAPOINTS], "readwrite")
    const dataStore = dataTransaction.objectStore(STORE_DATAPOINTS)
    const dataIndex = dataStore.index("timestamp")
    const dataRequest = dataIndex.openCursor(IDBKeyRange.upperBound(dataPointCutoff))

    await new Promise<void>((resolve) => {
      dataRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          deletedDataPoints++
          cursor.continue()
        } else {
          resolve()
        }
      }
      dataRequest.onerror = () => resolve()
    })

    // Clean old recordings
    const recordingTransaction = db.transaction([STORE_RECORDINGS], "readwrite")
    const recordingStore = recordingTransaction.objectStore(STORE_RECORDINGS)
    const recordingIndex = recordingStore.index("startTime")
    const recordingRequest = recordingIndex.openCursor(IDBKeyRange.upperBound(recordingCutoff))

    await new Promise<void>((resolve) => {
      recordingRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          // Keep crashed recordings longer
          if (!cursor.value.crashDetected) {
            cursor.delete()
            deletedRecordings++
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      recordingRequest.onerror = () => resolve()
    })

    // Clean old sessions
    const sessionTransaction = db.transaction([STORE_SESSIONS], "readwrite")
    const sessionStore = sessionTransaction.objectStore(STORE_SESSIONS)
    const sessionIndex = sessionStore.index("startTime")
    const sessionRequest = sessionIndex.openCursor(IDBKeyRange.upperBound(sessionCutoff))

    await new Promise<void>((resolve) => {
      sessionRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          deletedSessions++
          cursor.continue()
        } else {
          resolve()
        }
      }
      sessionRequest.onerror = () => resolve()
    })

    console.log(
      `[TelemetryBridge] Cleanup complete: ${deletedDataPoints} data points, ${deletedSessions} sessions, ${deletedRecordings} recordings deleted`,
    )

    return { deletedDataPoints, deletedSessions, deletedRecordings }
  }

  async forceCleanup(): Promise<void> {
    await this.cleanupOldData()
  }

  updateRetentionConfig(config: {
    dataPointTTL?: number
    recordingTTL?: number
    sessionTTL?: number
    autoCleanupEnabled?: boolean
    cleanupInterval?: number
  }) {
    this.config = { ...this.config, ...config }

    // Restart cleanup timer if interval changed
    if (config.cleanupInterval || config.autoCleanupEnabled !== undefined) {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer)
        this.cleanupTimer = null
      }
      if (this.config.autoCleanupEnabled) {
        this.startAutoCleanup()
      }
    }
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

/**
 * Create a new telemetry session
 */
async function createSession(snippetId?: string): Promise<any> {
  const db = await initTelemetryDB()

  const session = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    },
    appInfo: {
      url: window.location.href,
      version: "1.0.0",
      environment: window.location.hostname === "localhost" ? "development" : "production",
    },
    snippetId,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readwrite")
    const store = transaction.objectStore(STORE_SESSIONS)
    const request = store.add(session)

    request.onsuccess = () => resolve(session)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Store telemetry data point
 */
async function storeTelemetryData(
  sessionId: string,
  type: string,
  data: any,
  tags?: Record<string, string>,
): Promise<void> {
  const db = await initTelemetryDB()

  const dataPoint = {
    id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    timestamp: Date.now(),
    type,
    data,
    tags,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DATAPOINTS], "readwrite")
    const store = transaction.objectStore(STORE_DATAPOINTS)
    const request = store.add(dataPoint)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Query telemetry data with filters
 */
async function queryTelemetryData(filter: any): Promise<any[]> {
  const db = await initTelemetryDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DATAPOINTS], "readonly")
    const store = transaction.objectStore(STORE_DATAPOINTS)
    const results: any[] = []

    let request: IDBRequest

    if (filter.sessionIds && filter.sessionIds.length > 0) {
      // Query by session ID
      const index = store.index("sessionId")
      request = index.openCursor(IDBKeyRange.only(filter.sessionIds[0]))
    } else if (filter.startTime && filter.endTime) {
      // Query by time range
      const index = store.index("timestamp")
      request = index.openCursor(IDBKeyRange.bound(filter.startTime, filter.endTime))
    } else {
      // Get all
      request = store.openCursor()
    }

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        const dataPoint = cursor.value

        // Apply additional filters
        let matches = true

        if (filter.types && filter.types.length > 0 && !filter.types.includes(dataPoint.type)) {
          matches = false
        }

        if (filter.tags) {
          for (const [key, value] of Object.entries(filter.tags)) {
            if (!dataPoint.tags || dataPoint.tags[key] !== value) {
              matches = false
              break
            }
          }
        }

        if (matches) {
          results.push(dataPoint)
        }

        cursor.continue()
      } else {
        resolve(results)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all sessions
 */
async function getAllSessions(): Promise<any[]> {
  const db = await initTelemetryDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SESSIONS], "readonly")
    const store = transaction.objectStore(STORE_SESSIONS)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Create a blackbox recording with ring buffer
 */
async function createBlackboxRecording(
  sessionId: string,
  snippetId?: string,
  ringBufferSize: number = DEFAULT_RING_BUFFER_SIZE,
): Promise<any> {
  const db = await initTelemetryDB()

  const recording = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    startTime: Date.now(),
    crashDetected: false,
    dataPoints: [],
    ringBufferSize: Math.min(ringBufferSize, MAX_RING_BUFFER_SIZE),
    metadata: {
      snippetId,
      description: "",
      tags: [],
    },
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], "readwrite")
    const store = transaction.objectStore(STORE_RECORDINGS)
    const request = store.add(recording)

    request.onsuccess = () => resolve(recording)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update blackbox recording (for ring buffer updates)
 */
async function updateBlackboxRecording(recordingId: string, updates: Partial<any>): Promise<void> {
  const db = await initTelemetryDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], "readwrite")
    const store = transaction.objectStore(STORE_RECORDINGS)
    const getRequest = store.get(recordingId)

    getRequest.onsuccess = () => {
      const recording = getRequest.result
      if (!recording) {
        reject(new Error("Recording not found"))
        return
      }

      const updated = { ...recording, ...updates }
      const putRequest = store.put(updated)

      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Get blackbox recordings
 */
async function getBlackboxRecordings(filter?: { crashDetected?: boolean; sessionId?: string }): Promise<any[]> {
  const db = await initTelemetryDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECORDINGS], "readonly")
    const store = transaction.objectStore(STORE_RECORDINGS)

    if (filter?.crashDetected !== undefined) {
      const index = store.index("crashDetected")
      const request = index.getAll(filter.crashDetected ? 1 : 0)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } else if (filter?.sessionId) {
      const index = store.index("sessionId")
      const request = index.getAll(filter.sessionId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } else {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }
  })
}

/**
 * Export session data as JSON
 */
async function exportSessionData(sessionId: string): Promise<string> {
  const db = await initTelemetryDB()

  // Get session
  const sessionTransaction = db.transaction([STORE_SESSIONS], "readonly")
  const sessionStore = sessionTransaction.objectStore(STORE_SESSIONS)
  const session = await new Promise((resolve, reject) => {
    const request = sessionStore.get(sessionId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  // Get data points
  const dataPoints = await queryTelemetryData({ sessionIds: [sessionId] })

  // Get recordings
  const recordings = await getBlackboxRecordings({ sessionId })

  const exportData = {
    version: "1.0.0",
    exportTime: Date.now(),
    session,
    dataPoints,
    recordings,
  }

  return JSON.stringify(exportData, null, 2)
}
