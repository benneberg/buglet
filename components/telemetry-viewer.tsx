"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Download, RefreshCw, Trash2, Clock, Database } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TelemetryDataPoint, TelemetrySession } from "@/lib/telemetry-bridge"
import { TelemetryBridge } from "@/lib/telemetry-bridge"

interface TelemetryViewerProps {
  snippetId?: string
  onExport?: (data: any) => void
}

export function TelemetryViewer({ snippetId, onExport }: TelemetryViewerProps) {
  const [sessions, setSessions] = useState<TelemetrySession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [dataPoints, setDataPoints] = useState<TelemetryDataPoint[]>([])
  const [filteredData, setFilteredData] = useState<TelemetryDataPoint[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalSessions: 0,
    avgPointsPerSession: 0,
    dataTypes: [] as string[],
  })

  const bridge = new TelemetryBridge()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [snippetId])

  // Filter data when search or type filter changes
  useEffect(() => {
    filterData()
  }, [dataPoints, searchQuery, typeFilter])

  // Calculate stats when data changes
  useEffect(() => {
    calculateStats()
  }, [sessions, dataPoints])

  const loadSessions = async () => {
    setIsLoading(true)
    try {
      const allSessions = await bridge.getSessions(snippetId)
      setSessions(allSessions)

      // Auto-select most recent session
      if (allSessions.length > 0 && !selectedSession) {
        const mostRecent = allSessions[0]
        setSelectedSession(mostRecent.id)
        loadSessionData(mostRecent.id)
      }
    } catch (error) {
      console.error("Failed to load sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessionData = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const data = await bridge.getDataPoints(sessionId)
      setDataPoints(data)
    } catch (error) {
      console.error("Failed to load session data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterData = () => {
    let filtered = [...dataPoints]

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((point) => point.type === typeFilter)
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (point) =>
          point.type.toLowerCase().includes(query) ||
          JSON.stringify(point.data).toLowerCase().includes(query) ||
          Object.values(point.tags || {}).some((tag) => String(tag).toLowerCase().includes(query)),
      )
    }

    setFilteredData(filtered)
  }

  const calculateStats = () => {
    const uniqueTypes = [...new Set(dataPoints.map((p) => p.type))]
    setStats({
      totalPoints: dataPoints.length,
      totalSessions: sessions.length,
      avgPointsPerSession: sessions.length > 0 ? Math.round(dataPoints.length / sessions.length) : 0,
      dataTypes: uniqueTypes,
    })
  }

  const handleExport = async () => {
    if (!selectedSession) return

    try {
      const exportData = await bridge.exportSessionData(selectedSession)
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `telemetry-${selectedSession}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      if (onExport) {
        onExport(exportData)
      }
    } catch (error) {
      console.error("Failed to export data:", error)
    }
  }

  const handleClearSession = async () => {
    if (!selectedSession) return

    if (confirm("Are you sure you want to clear this session's data?")) {
      try {
        await bridge.clearSession(selectedSession)
        await loadSessions()
        setSelectedSession(null)
        setDataPoints([])
      } catch (error) {
        console.error("Failed to clear session:", error)
      }
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDataValue = (data: any): string => {
    if (typeof data === "object") {
      return JSON.stringify(data, null, 2)
    }
    return String(data)
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      memory: "bg-blue-500",
      fps: "bg-green-500",
      network: "bg-purple-500",
      error: "bg-red-500",
      video: "bg-yellow-500",
      custom: "bg-gray-500",
    }
    return colors[type] || colors.custom
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Data Points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Points/Session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPointsPerSession}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {stats.dataTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Telemetry Data Viewer</CardTitle>
              <CardDescription>Browse and analyze collected telemetry data</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadSessions} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!selectedSession}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSession} disabled={!selectedSession}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="data">Data Points</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Data Points Tab */}
            <TabsContent value="data" className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search data points..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {stats.dataTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Points List */}
              <ScrollArea className="h-[500px] border rounded-lg">
                {filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Database className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Telemetry Data</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {dataPoints.length === 0
                        ? "No telemetry data has been collected yet. Generate and run a snippet to start collecting data."
                        : "No data points match your current filters."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredData.map((point) => (
                      <Card key={point.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getTypeColor(point.type)}`} />
                            <Badge variant="outline">{point.type}</Badge>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(point.timestamp)}</span>
                          </div>
                          {point.tags && Object.keys(point.tags).length > 0 && (
                            <div className="flex gap-1">
                              {Object.entries(point.tags).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {formatDataValue(point.data)}
                        </pre>
                        {point.metadata && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span>Session: {point.sessionId}</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              <ScrollArea className="h-[500px] border rounded-lg">
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Clock className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Sessions</h3>
                    <p className="text-sm text-muted-foreground">No telemetry sessions have been created yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {sessions.map((session) => (
                      <Card
                        key={session.id}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedSession === session.id ? "border-primary" : ""
                        }`}
                        onClick={() => {
                          setSelectedSession(session.id)
                          loadSessionData(session.id)
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            <span className="font-mono text-sm">{session.id}</span>
                          </div>
                          {session.endTime ? (
                            <Badge variant="secondary">Completed</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Started: {formatTimestamp(session.startTime)}</div>
                          {session.endTime && <div>Ended: {formatTimestamp(session.endTime)}</div>}
                          {session.snippetId && <div>Snippet: {session.snippetId}</div>}
                        </div>
                        {session.deviceInfo && (
                          <div className="mt-2 text-xs">
                            <pre className="bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(session.deviceInfo, null, 2)}
                            </pre>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.dataTypes.map((type) => {
                        const count = dataPoints.filter((p) => p.type === type).length
                        const percentage = stats.totalPoints > 0 ? (count / stats.totalPoints) * 100 : 0
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{type}</span>
                              <span className="text-muted-foreground">
                                {count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getTypeColor(type)}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Session Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => {
                        const sessionPoints = dataPoints.filter((p) => p.sessionId === session.id).length
                        return (
                          <div key={session.id} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-xs truncate max-w-[200px]">{session.id}</span>
                            <Badge variant="outline">{sessionPoints} points</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dataPoints.slice(0, 10).map((point) => (
                      <div key={point.id} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${getTypeColor(point.type)}`} />
                        <span className="text-muted-foreground">{formatTimestamp(point.timestamp)}</span>
                        <Badge variant="outline" className="text-xs">
                          {point.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {JSON.stringify(point.data).substring(0, 50)}...
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
