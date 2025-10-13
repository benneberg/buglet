"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Save, RotateCcw, CheckCircle, AlertCircle } from "lucide-react"
import { type TelemetrySystemConfig, DEFAULT_CONFIG, TELEMETRY_PRESETS, validateConfig } from "@/lib/telemetry-config"

interface TelemetrySettingsProps {
  onConfigChange?: (config: TelemetrySystemConfig) => void
}

export function TelemetrySettings({ onConfigChange }: TelemetrySettingsProps) {
  const [config, setConfig] = useState<TelemetrySystemConfig>(DEFAULT_CONFIG)
  const [selectedPreset, setSelectedPreset] = useState<string>("default")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem("telemetry_config")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig(parsed)
      } catch (error) {
        console.error("Failed to load saved config:", error)
      }
    }
  }, [])

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    if (preset === "default") {
      setConfig(DEFAULT_CONFIG)
    } else {
      setConfig(TELEMETRY_PRESETS[preset as keyof typeof TELEMETRY_PRESETS])
    }
    setIsSaved(false)
  }

  const handleSave = () => {
    const validation = validateConfig(config)
    setValidationErrors(validation.errors)

    if (validation.valid) {
      localStorage.setItem("telemetry_config", JSON.stringify(config))
      setIsSaved(true)
      onConfigChange?.(config)

      setTimeout(() => setIsSaved(false), 3000)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setSelectedPreset("default")
    setValidationErrors([])
    setIsSaved(false)
  }

  const updateConfig = (path: string, value: any) => {
    const keys = path.split(".")
    const newConfig = { ...config }
    let current: any = newConfig

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] }
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    setConfig(newConfig)
    setIsSaved(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Telemetry System Configuration
              </CardTitle>
              <CardDescription>Configure data collection, storage, and retention settings</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                {isSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 border border-destructive rounded-lg bg-destructive/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Configuration Errors</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Configuration Preset</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="highVolume">High Volume</SelectItem>
                  <SelectItem value="privacyFocused">Privacy Focused</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a preset or customize individual settings below
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blackbox Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Blackbox Recorder</CardTitle>
          <CardDescription>Crash-resilient recording configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ringBufferSize">Ring Buffer Size</Label>
              <Input
                id="ringBufferSize"
                type="number"
                value={config.blackbox.ringBufferSize}
                onChange={(e) => updateConfig("blackbox.ringBufferSize", Number.parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Maximum data points to keep in memory</p>
            </div>

            <div>
              <Label htmlFor="persistInterval">Persist Interval (ms)</Label>
              <Input
                id="persistInterval"
                type="number"
                value={config.blackbox.persistInterval}
                onChange={(e) => updateConfig("blackbox.persistInterval", Number.parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">How often to save to storage</p>
            </div>

            <div>
              <Label htmlFor="heartbeatInterval">Heartbeat Interval (ms)</Label>
              <Input
                id="heartbeatInterval"
                type="number"
                value={config.blackbox.heartbeatInterval}
                onChange={(e) => updateConfig("blackbox.heartbeatInterval", Number.parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Frequency of heartbeat updates</p>
            </div>

            <div>
              <Label htmlFor="crashThreshold">Crash Threshold (ms)</Label>
              <Input
                id="crashThreshold"
                type="number"
                value={config.blackbox.crashThreshold}
                onChange={(e) => updateConfig("blackbox.crashThreshold", Number.parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Time without heartbeat to detect crash</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="crashDetection">Crash Detection</Label>
                <p className="text-xs text-muted-foreground">Automatically detect and recover from crashes</p>
              </div>
              <Switch
                id="crashDetection"
                checked={config.blackbox.crashDetectionEnabled}
                onCheckedChange={(checked) => updateConfig("blackbox.crashDetectionEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoRecover">Auto Recovery</Label>
                <p className="text-xs text-muted-foreground">Automatically recover crashed sessions on startup</p>
              </div>
              <Switch
                id="autoRecover"
                checked={config.blackbox.autoRecover}
                onCheckedChange={(checked) => updateConfig("blackbox.autoRecover", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>Control how long data is stored</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxSessions">Max Sessions</Label>
              <Input
                id="maxSessions"
                type="number"
                value={config.retention.maxSessions}
                onChange={(e) => updateConfig("retention.maxSessions", Number.parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="maxDataPoints">Max Data Points per Session</Label>
              <Input
                id="maxDataPoints"
                type="number"
                value={config.retention.maxDataPointsPerSession}
                onChange={(e) => updateConfig("retention.maxDataPointsPerSession", Number.parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="maxRecordings">Max Recordings</Label>
              <Input
                id="maxRecordings"
                type="number"
                value={config.retention.maxRecordings}
                onChange={(e) => updateConfig("retention.maxRecordings", Number.parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="maxCrashReports">Max Crash Reports</Label>
              <Input
                id="maxCrashReports"
                type="number"
                value={config.retention.maxCrashReports}
                onChange={(e) => updateConfig("retention.maxCrashReports", Number.parseInt(e.target.value))}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="sessionTTL">Session TTL (days)</Label>
              <Input
                id="sessionTTL"
                type="number"
                value={Math.round(config.retention.sessionTTL / (24 * 60 * 60 * 1000))}
                onChange={(e) =>
                  updateConfig("retention.sessionTTL", Number.parseInt(e.target.value) * 24 * 60 * 60 * 1000)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">How long to keep session data before cleanup</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
          <CardDescription>Control what data is collected</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="anonymizeIPs">Anonymize IP Addresses</Label>
              <p className="text-xs text-muted-foreground">Remove or hash IP addresses from telemetry</p>
            </div>
            <Switch
              id="anonymizeIPs"
              checked={config.privacy.anonymizeIPs}
              onCheckedChange={(checked) => updateConfig("privacy.anonymizeIPs", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="excludeUserAgent">Exclude User Agent</Label>
              <p className="text-xs text-muted-foreground">Don't collect browser user agent strings</p>
            </div>
            <Switch
              id="excludeUserAgent"
              checked={config.privacy.excludeUserAgent}
              onCheckedChange={(checked) => updateConfig("privacy.excludeUserAgent", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="excludeURL">Exclude URLs</Label>
              <p className="text-xs text-muted-foreground">Don't collect page URLs</p>
            </div>
            <Switch
              id="excludeURL"
              checked={config.privacy.excludeURL}
              onCheckedChange={(checked) => updateConfig("privacy.excludeURL", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>Optimize data collection performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                value={config.performance.batchSize}
                onChange={(e) => updateConfig("performance.batchSize", Number.parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Number of data points to batch together</p>
            </div>

            <div>
              <Label htmlFor="flushInterval">Flush Interval (ms)</Label>
              <Input
                id="flushInterval"
                type="number"
                value={config.performance.flushInterval}
                onChange={(e) => updateConfig("performance.flushInterval", Number.parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">How often to flush batched data</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableCompression">Enable Compression</Label>
              <p className="text-xs text-muted-foreground">Compress data before storage (experimental)</p>
            </div>
            <Switch
              id="enableCompression"
              checked={config.performance.enableCompression}
              onCheckedChange={(checked) => updateConfig("performance.enableCompression", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
