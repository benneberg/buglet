"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle, Download, Play, Square, Trash2, AlertTriangle, Database } from "lucide-react"
import { CrashResilientBlackbox, type BlackboxRecording, type CrashReport } from "@/lib/crash-resilient-blackbox"
import { TelemetryBridge } from "@/lib/telemetry-bridge"

interface BlackboxRecorderProps {
  snippetId?: string
  onCrashDetected?: (report: CrashReport) => void
}

export function BlackboxRecorder({ snippetId, onCrashDetected }: BlackboxRecorderProps) {
  const [blackbox] = useState(() => new CrashResilientBlackbox())
  const [isRecording, setIsRecording] = useState(false)
  const [currentRecording, setCurrentRecording] = useState<BlackboxRecording | null>(null)
  const [recordings, setRecordings] = useState<BlackboxRecording[]>([])
  const [crashReports, setCrashReports] = useState<CrashReport[]>([])
  const [stats, setStats] = useState({
    totalRecordings: 0,
    crashedSessions: 0,
    totalDataPoints: 0,
    avgDataPointsPerRecording: 0,
  })

  useEffect(() => {
    loadRecordings()
    loadCrashReports()

    // Listen for crash recovery events
    const handleCrashRecovery = (event: CustomEvent) => {
      const recording = event.detail.recording as BlackboxRecording
      console.log("[Blackbox UI] Crash recovered:", recording)
      loadRecordings()
      loadCrashReports()

      if (onCrashDetected) {
        const crashes = blackbox.getCrashReports()
        const relatedCrash = crashes.find((c) => c.recordingId === recording.id)
        if (relatedCrash) {
          onCrashDetected(relatedCrash)
        }
      }
    }

    window.addEventListener("blackbox:crash-recovered", handleCrashRecovery as EventListener)

    return () => {
      window.removeEventListener("blackbox:crash-recovered", handleCrashRecovery as EventListener)
    }
  }, [])

  useEffect(() => {
    calculateStats()
  }, [recordings])

  const loadRecordings = () => {
    const allRecordings = blackbox.getAllRecordings()
    setRecordings(allRecordings)
  }

  const loadCrashReports = () => {
    const reports = blackbox.getCrashReports()
    setCrashReports(reports)
  }

  const calculateStats = () => {
    const totalDataPoints = recordings.reduce((sum, r) => sum + r.dataPoints.length, 0)
    const crashedSessions = recordings.filter((r) => r.crashDetected).length

    setStats({
      totalRecordings: recordings.length,
      crashedSessions,
      totalDataPoints,
      avgDataPointsPerRecording: recordings.length > 0 ? Math.round(totalDataPoints / recordings.length) : 0,
    })
  }

  const startRecording = () => {
    const bridge = new TelemetryBridge()
    const sessionId = `session_${Date.now()}`

    const recordingId = blackbox.startRecording(sessionId, {
      snippetId,
      description: "Manual blackbox recording",
      tags: ["manual"],
    })

    setIsRecording(true)

    // Start capturing telemetry data
    const captureInterval = setInterval(() => {
      const recording = blackbox.getCurrentRecording()
      if (recording) {
        setCurrentRecording({ ...recording })

        // Simulate telemetry capture (in real app, this would come from actual telemetry)
        if ("memory" in performance) {
          blackbox.record({
            id: `dp_${Date.now()}`,
            sessionId,
            timestamp: Date.now(),
            type: "memory",
            data: {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            },
            tags: { source: "blackbox-recorder" },
          })
        }
      } else {
        clearInterval(captureInterval)
      }
    }, 1000)

    // Store interval ID for cleanup
    ;(window as any).__blackboxCaptureInterval = captureInterval
  }

  const stopRecording = () => {
    const recording = blackbox.stopRecording()
    setIsRecording(false)
    setCurrentRecording(null)
    loadRecordings()

    // Clear capture interval
    if ((window as any).__blackboxCaptureInterval) {
      clearInterval((window as any).__blackboxCaptureInterval)
      delete (window as any).__blackboxCaptureInterval
    }
  }

  const handleExport = (recordingId: string) => {
    const exported = blackbox.exportRecording(recordingId)
    if (exported) {
      const blob = new Blob([exported], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `blackbox-recording-${recordingId}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleDelete = (recordingId: string) => {
    if (confirm("Are you sure you want to delete this recording?")) {
      blackbox.deleteRecording(recordingId)
      loadRecordings()
    }
  }

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all recordings and crash reports?")) {
      blackbox.clearAllRecordings()
      loadRecordings()
      loadCrashReports()
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Recordings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecordings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Crashed Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.crashedSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Data Points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDataPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Points/Recording</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDataPointsPerRecording}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Crash-Resilient Blackbox Recorder</CardTitle>
              <CardDescription>Record telemetry data with automatic crash detection and recovery</CardDescription>
            </div>
            <div className="flex gap-2">
              {isRecording ? (
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              ) : (
                <Button onClick={startRecording}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              )}
              <Button variant="outline" onClick={handleClearAll} disabled={recordings.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isRecording && currentRecording && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-semibold">Recording in Progress</span>
                </div>
                <Badge variant="secondary">{currentRecording.dataPoints.length} data points</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Session: {currentRecording.sessionId}</div>
                <div>Duration: {formatDuration(currentRecording.startTime)}</div>
                <div>Ring Buffer: {currentRecording.ringBufferSize} max points</div>
              </div>
            </div>
          )}

          {/* Crash Reports */}
          {crashReports.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Crash Reports ({crashReports.length})
              </h3>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="space-y-2 p-4">
                  {crashReports.map((report) => (
                    <Card key={report.id} className="border-destructive/50">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="font-mono text-sm">{report.id}</span>
                          </div>
                          <Badge variant="destructive">Crash</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Time: {formatTimestamp(report.timestamp)}</div>
                          <div>Session: {report.sessionId}</div>
                          <div>Pre-crash data: {report.preCrashData.length} points</div>
                          {report.errorInfo && <div>Error: {report.errorInfo.message}</div>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Recordings List */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Recordings</h3>
            {recordings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No recordings yet</p>
                <p className="text-sm mt-1">Start recording to capture telemetry data</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="space-y-2 p-4">
                  {recordings.map((recording) => (
                    <Card key={recording.id} className={recording.crashDetected ? "border-destructive/50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {recording.crashDetected ? (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            <span className="font-mono text-sm">{recording.id}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleExport(recording.id)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(recording.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {recording.crashDetected ? (
                              <Badge variant="destructive">Crashed</Badge>
                            ) : (
                              <Badge variant="secondary">Completed</Badge>
                            )}
                            <Badge variant="outline">{recording.dataPoints.length} points</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Started: {formatTimestamp(recording.startTime)}</div>
                            {recording.endTime && <div>Ended: {formatTimestamp(recording.endTime)}</div>}
                            <div>Duration: {formatDuration(recording.startTime, recording.endTime)}</div>
                            <div>Session: {recording.sessionId}</div>
                            {recording.metadata?.snippetId && <div>Snippet: {recording.metadata.snippetId}</div>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
