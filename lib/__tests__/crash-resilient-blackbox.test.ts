/**
 * Crash-Resilient Blackbox Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals"
import { CrashResilientBlackbox, getGlobalBlackbox, destroyGlobalBlackbox } from "../crash-resilient-blackbox"
import type { TelemetryDataPoint } from "../telemetry-bridge"

describe("CrashResilientBlackbox", () => {
  let blackbox: CrashResilientBlackbox

  beforeEach(() => {
    localStorage.clear()
    destroyGlobalBlackbox()
    blackbox = new CrashResilientBlackbox({
      ringBufferSize: 10,
      persistInterval: 1000,
      crashDetectionEnabled: true,
      autoRecover: false,
    })
  })

  afterEach(() => {
    if (blackbox) {
      blackbox.destroy()
    }
    destroyGlobalBlackbox()
  })

  describe("Recording Management", () => {
    it("should start a new recording", () => {
      const recordingId = blackbox.startRecording("session_123", {
        description: "Test recording",
      })

      expect(recordingId).toMatch(/^rec_/)
      expect(blackbox.getCurrentRecording()).toBeTruthy()
      expect(blackbox.getCurrentRecording()?.sessionId).toBe("session_123")
    })

    it("should stop a recording", () => {
      blackbox.startRecording("session_123")
      const recording = blackbox.stopRecording()

      expect(recording).toBeTruthy()
      expect(recording?.endTime).toBeDefined()
      expect(blackbox.getCurrentRecording()).toBeNull()
    })

    it("should return null when stopping without active recording", () => {
      const result = blackbox.stopRecording()
      expect(result).toBeNull()
    })
  })

  describe("Data Recording", () => {
    it("should record telemetry data points", () => {
      blackbox.startRecording("session_123")

      const dataPoint: TelemetryDataPoint = {
        id: "dp_1",
        sessionId: "session_123",
        timestamp: Date.now(),
        type: "memory",
        data: { usedJSHeapSize: 1000000 },
        tags: {},
      }

      blackbox.record(dataPoint)

      const recording = blackbox.getCurrentRecording()
      expect(recording?.dataPoints.length).toBe(1)
      expect(recording?.dataPoints[0].id).toBe("dp_1")
    })

    it("should maintain ring buffer size", () => {
      blackbox.startRecording("session_123")

      // Add 15 data points (buffer size is 10)
      for (let i = 0; i < 15; i++) {
        blackbox.record({
          id: `dp_${i}`,
          sessionId: "session_123",
          timestamp: Date.now(),
          type: "memory",
          data: { value: i },
          tags: {},
        })
      }

      const recording = blackbox.getCurrentRecording()
      expect(recording?.dataPoints.length).toBe(10)
      expect(recording?.dataPoints[0].id).toBe("dp_5") // First 5 should be removed
    })

    it("should warn when recording without active session", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

      blackbox.record({
        id: "dp_1",
        sessionId: "session_123",
        timestamp: Date.now(),
        type: "memory",
        data: {},
        tags: {},
      })

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No active recording"))
      consoleSpy.mockRestore()
    })
  })

  describe("Persistence", () => {
    it("should persist recordings to localStorage", () => {
      blackbox.startRecording("session_123")
      blackbox.record({
        id: "dp_1",
        sessionId: "session_123",
        timestamp: Date.now(),
        type: "memory",
        data: {},
        tags: {},
      })

      blackbox.stopRecording()

      const recordings = blackbox.getAllRecordings()
      expect(recordings.length).toBe(1)
      expect(recordings[0].sessionId).toBe("session_123")
    })

    it("should retrieve specific recording by ID", () => {
      const recordingId = blackbox.startRecording("session_123")
      blackbox.stopRecording()

      const recording = blackbox.getRecording(recordingId)
      expect(recording).toBeTruthy()
      expect(recording?.id).toBe(recordingId)
    })

    it("should return null for non-existent recording", () => {
      const recording = blackbox.getRecording("non_existent")
      expect(recording).toBeNull()
    })
  })

  describe("Recording Deletion", () => {
    it("should delete a specific recording", () => {
      const recordingId = blackbox.startRecording("session_123")
      blackbox.stopRecording()

      expect(blackbox.getAllRecordings().length).toBe(1)

      const deleted = blackbox.deleteRecording(recordingId)
      expect(deleted).toBe(true)
      expect(blackbox.getAllRecordings().length).toBe(0)
    })

    it("should clear all recordings", () => {
      blackbox.startRecording("session_1")
      blackbox.stopRecording()
      blackbox.startRecording("session_2")
      blackbox.stopRecording()

      expect(blackbox.getAllRecordings().length).toBe(2)

      blackbox.clearAllRecordings()
      expect(blackbox.getAllRecordings().length).toBe(0)
    })

    it("should clear only old recordings when time specified", () => {
      const now = Date.now()

      // Create old recording
      blackbox.startRecording("session_old")
      const oldRecording = blackbox.stopRecording()
      if (oldRecording) {
        oldRecording.startTime = now - 2 * 24 * 60 * 60 * 1000 // 2 days ago
        localStorage.setItem("blackbox_recordings", JSON.stringify([oldRecording]))
      }

      // Create new recording
      blackbox.startRecording("session_new")
      blackbox.stopRecording()

      // Clear recordings older than 1 day
      blackbox.clearAllRecordings(24 * 60 * 60 * 1000)

      const recordings = blackbox.getAllRecordings()
      expect(recordings.length).toBe(1)
      expect(recordings[0].sessionId).toBe("session_new")
    })
  })

  describe("Export", () => {
    it("should export recording as JSON", () => {
      const recordingId = blackbox.startRecording("session_123", {
        description: "Export test",
      })
      blackbox.stopRecording()

      const exported = blackbox.exportRecording(recordingId)
      expect(exported).toBeTruthy()

      const parsed = JSON.parse(exported!)
      expect(parsed.version).toBe("1.0.0")
      expect(parsed.recording.sessionId).toBe("session_123")
      expect(parsed.recording.metadata.description).toBe("Export test")
    })

    it("should return null for non-existent recording export", () => {
      const exported = blackbox.exportRecording("non_existent")
      expect(exported).toBeNull()
    })
  })

  describe("Crash Detection", () => {
    it("should detect crashed sessions on initialization", () => {
      // Simulate active session
      const activeSession = {
        recordingId: "rec_crashed",
        timestamp: Date.now(),
        heartbeat: Date.now() - 60000, // 60 seconds ago
      }
      localStorage.setItem("blackbox_recordings_active", JSON.stringify(activeSession))

      // Create recording
      const recording = {
        id: "rec_crashed",
        sessionId: "session_crashed",
        startTime: Date.now() - 60000,
        crashDetected: false,
        dataPoints: [],
        ringBufferSize: 10,
        metadata: {},
      }
      localStorage.setItem("blackbox_recordings", JSON.stringify([recording]))

      // Create new blackbox instance (should detect crash)
      const newBlackbox = new CrashResilientBlackbox({
        crashDetectionEnabled: true,
        autoRecover: false,
      })

      const recordings = newBlackbox.getAllRecordings()
      expect(recordings[0].crashDetected).toBe(true)

      newBlackbox.destroy()
    })

    it("should create crash reports", () => {
      // Simulate crashed session
      const activeSession = {
        recordingId: "rec_crashed",
        timestamp: Date.now(),
        heartbeat: Date.now() - 60000,
      }
      localStorage.setItem("blackbox_recordings_active", JSON.stringify(activeSession))

      const recording = {
        id: "rec_crashed",
        sessionId: "session_crashed",
        startTime: Date.now() - 60000,
        crashDetected: false,
        dataPoints: [
          {
            id: "dp_1",
            sessionId: "session_crashed",
            timestamp: Date.now(),
            type: "memory",
            data: {},
            tags: {},
          },
        ],
        ringBufferSize: 10,
        metadata: {},
      }
      localStorage.setItem("blackbox_recordings", JSON.stringify([recording]))

      const newBlackbox = new CrashResilientBlackbox({
        crashDetectionEnabled: true,
        autoRecover: false,
      })

      const crashReports = newBlackbox.getCrashReports()
      expect(crashReports.length).toBeGreaterThan(0)

      newBlackbox.destroy()
    })
  })

  describe("Global Instance", () => {
    it("should create and return global blackbox instance", () => {
      const instance1 = getGlobalBlackbox()
      const instance2 = getGlobalBlackbox()

      expect(instance1).toBe(instance2) // Should be same instance
    })

    it("should destroy global instance", () => {
      const instance = getGlobalBlackbox()
      expect(instance).toBeTruthy()

      destroyGlobalBlackbox()

      const newInstance = getGlobalBlackbox()
      expect(newInstance).not.toBe(instance) // Should be new instance
    })
  })

  describe("Cleanup", () => {
    it("should cleanup old recordings", () => {
      const now = Date.now()

      // Create old recordings
      for (let i = 0; i < 5; i++) {
        blackbox.startRecording(`session_old_${i}`)
        const recording = blackbox.stopRecording()
        if (recording) {
          recording.startTime = now - 2 * 24 * 60 * 60 * 1000 // 2 days ago
        }
      }

      // Create new recordings
      for (let i = 0; i < 3; i++) {
        blackbox.startRecording(`session_new_${i}`)
        blackbox.stopRecording()
      }

      // Cleanup recordings older than 1 day
      const deleted = blackbox.cleanupOldRecordings(24 * 60 * 60 * 1000)

      expect(deleted).toBe(5)
      expect(blackbox.getAllRecordings().length).toBe(3)
    })

    it("should keep crashed recordings longer", () => {
      const now = Date.now()

      // Create old crashed recording
      blackbox.startRecording("session_crashed")
      const crashedRecording = blackbox.stopRecording()
      if (crashedRecording) {
        crashedRecording.startTime = now - 36 * 60 * 60 * 1000 // 36 hours ago
        crashedRecording.crashDetected = true
        localStorage.setItem("blackbox_recordings", JSON.stringify([crashedRecording]))
      }

      // Cleanup with 24 hour retention (crashed should be kept due to 2x retention)
      const deleted = blackbox.cleanupOldRecordings(24 * 60 * 60 * 1000)

      expect(deleted).toBe(0)
      expect(blackbox.getAllRecordings().length).toBe(1)
    })
  })
})
