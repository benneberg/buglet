# Telemetry Data Bridge - Complete Guide

## Overview

The Telemetry Data Bridge is a comprehensive system for collecting, storing, and analyzing application telemetry data. It provides crash-resilient recording, real-time monitoring, and AI-powered analysis capabilities.

## Architecture

### Core Components

1. **Telemetry Bridge** (`lib/telemetry-bridge.ts`)
   - Client-side IndexedDB storage
   - Session management
   - Data point collection
   - Export/import functionality

2. **Crash-Resilient Blackbox** (`lib/crash-resilient-blackbox.ts`)
   - Ring buffer implementation
   - Automatic crash detection
   - Pre-crash data preservation
   - Heartbeat monitoring

3. **Telemetry Collector API** (`app/api/collect/route.ts`)
   - REST endpoints for data submission
   - Session management
   - Export capabilities

4. **Telemetry Viewer UI** (`components/telemetry-viewer.tsx`)
   - Data visualization
   - Search and filtering
   - Analytics dashboard

5. **Blackbox Recorder UI** (`components/blackbox-recorder.tsx`)
   - Recording controls
   - Crash report viewing
   - Export functionality

## Quick Start

### 1. Basic Telemetry Collection

\`\`\`typescript
import { TelemetryBridge } from '@/lib/telemetry-bridge'

// Initialize the bridge
const bridge = new TelemetryBridge()

// Create a session
const session = await bridge.createSession({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  screenResolution: `${screen.width}x${screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
}, {
  url: window.location.href,
  version: '1.0.0',
  environment: 'production',
})

// Record data points
await bridge.recordDataPoint({
  id: `dp_${Date.now()}`,
  sessionId: session.id,
  timestamp: Date.now(),
  type: 'memory',
  data: {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
  },
  tags: { source: 'app' },
})

// End session
await bridge.endSession(session.id)
\`\`\`

### 2. Crash-Resilient Recording

\`\`\`typescript
import { CrashResilientBlackbox } from '@/lib/crash-resilient-blackbox'

// Initialize blackbox
const blackbox = new CrashResilientBlackbox({
  ringBufferSize: 1000,
  persistInterval: 5000,
  crashDetectionEnabled: true,
  autoRecover: true,
})

// Start recording
const recordingId = blackbox.startRecording('session_123', {
  snippetId: 'snippet_456',
  description: 'Production monitoring',
  tags: ['production', 'critical'],
})

// Record data
blackbox.record({
  id: `dp_${Date.now()}`,
  sessionId: 'session_123',
  timestamp: Date.now(),
  type: 'network',
  data: { url: '/api/users', duration: 150, status: 200 },
})

// Stop recording
const recording = blackbox.stopRecording()
\`\`\`

### 3. Using the UI Components

\`\`\`tsx
import { TelemetryViewer } from '@/components/telemetry-viewer'
import { BlackboxRecorder } from '@/components/blackbox-recorder'

function MyApp() {
  return (
    <div>
      {/* Telemetry viewer */}
      <TelemetryViewer 
        snippetId="snippet_123"
        onExport={(data) => console.log('Exported:', data)}
      />
      
      {/* Blackbox recorder */}
      <BlackboxRecorder
        snippetId="snippet_123"
        onCrashDetected={(report) => console.log('Crash:', report)}
      />
    </div>
  )
}
\`\`\`

## Configuration

### Telemetry Bridge Configuration

\`\`\`typescript
interface TelemetryConfig {
  dbName: string              // IndexedDB database name
  version: number             // Database version
  sessionStore: string        // Session object store name
  dataPointStore: string      // Data point object store name
  dataPointTTL: number        // How long to keep data points (ms, default: 1 hour)
  recordingTTL: number        // How long to keep recordings (ms, default: 24 hours)
  sessionTTL: number          // How long to keep sessions (ms, default: 7 days)
  autoCleanupEnabled: boolean // Enable automatic cleanup (default: true)
  cleanupInterval: number     // Cleanup frequency (ms, default: 5 minutes)
}

const bridge = new TelemetryBridge({
  dbName: 'my-app-telemetry',
  version: 1,
  sessionStore: 'sessions',
  dataPointStore: 'dataPoints',
  dataPointTTL: 60 * 60 * 1000, // 1 hour
  recordingTTL: 24 * 60 * 60 * 1000, // 24 hours
  sessionTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  autoCleanupEnabled: true,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
})
\`\`\`

### Blackbox Configuration

\`\`\`typescript
interface BlackboxConfig {
  ringBufferSize: number          // Max data points (default: 1000)
  persistInterval: number         // Persist frequency in ms (default: 5000)
  crashDetectionEnabled: boolean  // Enable crash detection (default: true)
  autoRecover: boolean           // Auto-recover on startup (default: true)
  storageKey: string             // localStorage key (default: 'blackbox_recordings')
}

const blackbox = new CrashResilientBlackbox({
  ringBufferSize: 1000,
  persistInterval: 5000,
  crashDetectionEnabled: true,
  autoRecover: true,
  storageKey: 'my-app-blackbox',
})
\`\`\`

## Data Retention & Cleanup

### Automatic Cleanup

The telemetry system includes automatic cleanup to prevent storage bloat when apps run for extended periods (days or weeks).

**Default Retention Policies:**
- **Data Points**: 1 hour (keeps only the last hour of telemetry)
- **Recordings**: 24 hours (blackbox recordings kept for 1 day)
- **Sessions**: 7 days (session metadata kept for 1 week)
- **Crashed Recordings**: 2x longer (preserved for analysis)

**How It Works:**
1. Automatic cleanup runs every 5 minutes (configurable)
2. Deletes data older than the configured TTL
3. Preserves crashed recordings longer for debugging
4. Logs cleanup statistics to console

\`\`\`typescript
const bridge = new TelemetryBridge({
  dataPointTTL: 30 * 60 * 1000, // Keep last 30 minutes
  recordingTTL: 12 * 60 * 60 * 1000, // Keep recordings for 12 hours
  sessionTTL: 3 * 24 * 60 * 60 * 1000, // Keep sessions for 3 days
  autoCleanupEnabled: true,
  cleanupInterval: 10 * 60 * 1000, // Run cleanup every 10 minutes
})

await bridge.forceCleanup()

bridge.updateRetentionConfig({
  dataPointTTL: 2 * 60 * 60 * 1000, // Change to 2 hours
  autoCleanupEnabled: true,
})

const stats = await bridge.cleanupOldData()
console.log(`Deleted: ${stats.deletedDataPoints} data points, ${stats.deletedSessions} sessions`)
\`\`\`

### Ring Buffer Behavior

The blackbox recorder uses a ring buffer to maintain a fixed-size window of the most recent data:

\`\`\`typescript
const blackbox = new CrashResilientBlackbox({
  ringBufferSize: 1000, // Keep last 1000 data points
})

// As new data arrives, oldest data is automatically removed
blackbox.record(dataPoint1) // Buffer: [dataPoint1]
blackbox.record(dataPoint2) // Buffer: [dataPoint1, dataPoint2]
// ... 998 more data points ...
blackbox.record(dataPoint1001) // Buffer: [dataPoint2, ..., dataPoint1001]
// dataPoint1 was automatically removed

blackbox.cleanupOldRecordings(24 * 60 * 60 * 1000) // Remove recordings older than 24 hours
\`\`\`

### Remote Debugging Architecture

**Important:** bugLet is designed to run on a **different device** than the app being debugged.

**Architecture:**
1. **Instrumented App** (Client) - Runs on user's device/browser
2. **bugLet Dashboard** (Server) - Runs on developer's machine
3. **Data Flow** - Client sends telemetry to server via REST API

\`\`\`typescript
// Configure API endpoints to point to bugLet server
const BUGLET_SERVER = 'https://buglet.yourcompany.com'

fetch(`${BUGLET_SERVER}/api/collect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'memory',
    data: { usedJSHeapSize: performance.memory.usedJSHeapSize },
    sessionId: 'session_123',
    timestamp: Date.now(),
  }),
})

// Receives telemetry from remote clients
// Stores in IndexedDB for offline-first viewing
// Provides UI for analysis and debugging
\`\`\`

**Benefits of Remote Architecture:**
- Debug production apps without affecting performance
- Collect telemetry from multiple devices simultaneously
- Survive crashes on the client device
- Centralized debugging dashboard
- Works across different networks/locations

## Data Types

### TelemetryDataPoint

\`\`\`typescript
interface TelemetryDataPoint {
  id: string                    // Unique identifier
  sessionId: string             // Associated session ID
  timestamp: number             // Unix timestamp
  type: 'memory' | 'fps' | 'network' | 'video' | 'error' | 'custom'
  data: any                     // Telemetry payload
  tags?: Record<string, string> // Optional tags
  metadata?: {
    userAgent?: string
    url?: string
    ip?: string
  }
}
\`\`\`

### TelemetrySession

\`\`\`typescript
interface TelemetrySession {
  id: string
  startTime: number
  endTime?: number
  deviceInfo: {
    userAgent: string
    platform: string
    screenResolution: string
    viewport: string
  }
  appInfo: {
    url: string
    version?: string
    environment?: string
  }
  snippetId?: string
}
\`\`\`

### BlackboxRecording

\`\`\`typescript
interface BlackboxRecording {
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
\`\`\`

## API Endpoints

### POST /api/collect

Submit telemetry data.

**Request:**
\`\`\`json
{
  "type": "memory",
  "data": {
    "usedJSHeapSize": 12345678,
    "totalJSHeapSize": 23456789
  },
  "sessionId": "session_123",
  "timestamp": 1234567890,
  "tags": { "environment": "production" }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Telemetry data received",
  "dataPoint": { /* ... */ }
}
\`\`\`

### GET /api/sessions

List telemetry sessions.

**Query Parameters:**
- `limit` - Number of sessions to return (default: 50)
- `offset` - Pagination offset (default: 0)
- `snippetId` - Filter by snippet ID

**Response:**
\`\`\`json
{
  "total": 100,
  "limit": 50,
  "offset": 0,
  "sessions": [ /* ... */ ]
}
\`\`\`

### GET /api/export

Export session data.

**Query Parameters:**
- `sessionId` - Session ID to export (required)
- `format` - Export format: 'json' or 'csv' (default: 'json')

**Response:**
\`\`\`json
{
  "version": "1.0.0",
  "exportTime": 1234567890,
  "session": { /* ... */ },
  "dataPoints": [ /* ... */ ]
}
\`\`\`

## Advanced Usage

### Custom Data Types

\`\`\`typescript
// Define custom telemetry type
interface CustomTelemetry extends TelemetryDataPoint {
  type: 'custom'
  data: {
    eventName: string
    eventData: any
    userId?: string
  }
}

// Record custom data
await bridge.recordDataPoint({
  id: `custom_${Date.now()}`,
  sessionId: session.id,
  timestamp: Date.now(),
  type: 'custom',
  data: {
    eventName: 'checkout_completed',
    eventData: { orderId: '12345', amount: 99.99 },
    userId: 'user_789',
  },
  tags: { category: 'conversion' },
})
\`\`\`

### Filtering and Querying

\`\`\`typescript
// Get data points with filters
const dataPoints = await bridge.getDataPoints('session_123', {
  types: ['memory', 'network'],
  startTime: Date.now() - 3600000, // Last hour
  endTime: Date.now(),
  tags: { environment: 'production' },
})

// Search data points
const results = await bridge.searchDataPoints('session_123', 'error')
\`\`\`

### Crash Recovery

\`\`\`typescript
// Listen for crash recovery events
window.addEventListener('blackbox:crash-recovered', (event) => {
  const recording = event.detail.recording
  console.log('Recovered crashed session:', recording)
  
  // Analyze pre-crash data
  const preCrashData = recording.dataPoints.slice(-100)
  
  // Send to analytics
  sendCrashReport(recording)
})

// Get crash reports
const crashes = blackbox.getCrashReports()
crashes.forEach(crash => {
  console.log('Crash detected:', crash.timestamp)
  console.log('Pre-crash data points:', crash.preCrashData.length)
  console.log('System state:', crash.systemState)
})
\`\`\`

### Export and Import

\`\`\`typescript
// Export session data
const exportData = await bridge.exportSessionData('session_123')
const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
// Download or send to server

// Export recording
const recordingJson = blackbox.exportRecording('rec_123')
// Save or transmit

// Import data (future feature)
// await bridge.importSessionData(importedData)
\`\`\`

## Best Practices

### 1. Session Management

- Create a new session for each user visit
- End sessions when users leave or after timeout
- Include relevant metadata (version, environment, etc.)

### 2. Data Point Recording

- Use consistent type names
- Add meaningful tags for filtering
- Keep data payloads reasonably sized
- Batch data points when possible

### 3. Ring Buffer Sizing

- Set buffer size based on expected data volume
- Typical range: 500-2000 data points
- Monitor memory usage in production
- For long-running apps: Use smaller buffers (200-500) with aggressive cleanup

### 4. Crash Detection

- Enable crash detection in production
- Set appropriate heartbeat intervals
- Test recovery mechanisms regularly

### 5. Performance

- Use IndexedDB for client-side storage
- Persist data periodically, not on every write
- Clean up old sessions regularly
- Consider data retention policies
- Enable automatic cleanup for production deployments
- Monitor storage quota and adjust retention as needed

### 6. Long-Running Applications

- Use time-based retention (keep last 10-60 minutes)
- Enable automatic cleanup with short intervals
- Use smaller ring buffers (200-500 data points)
- Monitor storage usage and adjust dynamically
- Preserve only crashed recordings for extended periods
- Consider server-side storage for historical data

\`\`\`typescript
const config = {
  dataPointTTL: 30 * 60 * 1000, // 30 minutes
  recordingTTL: 2 * 60 * 60 * 1000, // 2 hours
  sessionTTL: 24 * 60 * 60 * 1000, // 1 day
  autoCleanupEnabled: true,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
}

const bridge = new TelemetryBridge(config)
const blackbox = new CrashResilientBlackbox({
  ringBufferSize: 300,
  persistInterval: 10000,
})
\`\`\`

## Troubleshooting

### Issue: IndexedDB not available

**Solution:** Check browser compatibility and ensure HTTPS in production.

\`\`\`typescript
if (!window.indexedDB) {
  console.error('IndexedDB not supported')
  // Fallback to localStorage or server-side storage
}
\`\`\`

### Issue: Storage quota exceeded

**Solution:** Implement data cleanup and retention policies.

\`\`\`typescript
await bridge.forceCleanup() // Uses configured TTL

const stats = await bridge.cleanupOldData()
console.log(`Cleaned up ${stats.deletedDataPoints} data points`)

const deletedCount = blackbox.cleanupOldRecordings(60 * 60 * 1000) // 1 hour
console.log(`Deleted ${deletedCount} old recordings`)
\`\`\`

## Examples

### Memory Leak Detection

\`\`\`typescript
const blackbox = new CrashResilientBlackbox({ ringBufferSize: 2000 })
const recordingId = blackbox.startRecording('session_leak_test')

// Monitor memory every second
setInterval(() => {
  if (performance.memory) {
    blackbox.record({
      id: `mem_${Date.now()}`,
      sessionId: 'session_leak_test',
      timestamp: Date.now(),
      type: 'memory',
      data: {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      },
    })
  }
}, 1000)

// After some time, analyze the recording
setTimeout(() => {
  const recording = blackbox.stopRecording()
  const memoryData = recording.dataPoints.map(dp => dp.data.usedJSHeapSize)
  
  // Check for consistent growth
  const isLeaking = memoryData.every((val, i, arr) => 
    i === 0 || val >= arr[i - 1]
  )
  
  if (isLeaking) {
    console.warn('Memory leak detected!')
  }
}, 60000)
\`\`\`

### Network Performance Monitoring

\`\`\`typescript
const bridge = new TelemetryBridge()
const session = await bridge.createSession(/* ... */)

// Intercept fetch
const originalFetch = window.fetch
window.fetch = async (...args) => {
  const startTime = performance.now()
  const url = typeof args[0] === 'string' ? args[0] : args[0].url
  
  try {
    const response = await originalFetch(...args)
    const duration = performance.now() - startTime
    
    await bridge.recordDataPoint({
      id: `net_${Date.now()}`,
      sessionId: session.id,
      timestamp: Date.now(),
      type: 'network',
      data: {
        url,
        method: args[1]?.method || 'GET',
        status: response.status,
        duration,
        ok: response.ok,
      },
    })
    
    return response
  } catch (error) {
    const duration = performance.now() - startTime
    
    await bridge.recordDataPoint({
      id: `net_err_${Date.now()}`,
      sessionId: session.id,
      timestamp: Date.now(),
      type: 'error',
      data: {
        url,
        method: args[1]?.method || 'GET',
        error: error.message,
        duration,
      },
    })
    
    throw error
  }
}
\`\`\`

## Support

For issues, questions, or contributions, please refer to the main bugLet documentation or open an issue in the repository.

## License

This telemetry system is part of the bugLet project and follows the same license terms.
