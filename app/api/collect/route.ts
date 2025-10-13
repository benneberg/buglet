import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/collect
 * Receives telemetry data from instrumented applications
 * Stores data in IndexedDB via client-side bridge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.type || !body.data) {
      return NextResponse.json({ error: "Missing required fields: type, data" }, { status: 400 })
    }

    // Extract telemetry data
    const { type, data, timestamp, sessionId, tags, userAgent, url } = body

    // Create response with instructions for client-side storage
    // Since we're using IndexedDB (client-side), we return the data
    // for the client to store locally
    const telemetryPoint = {
      id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId || `session_${Date.now()}`,
      timestamp: timestamp || Date.now(),
      type,
      data,
      tags: tags || {},
      metadata: {
        userAgent: userAgent || request.headers.get("user-agent"),
        url: url || request.headers.get("referer"),
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      },
    }

    // In a real implementation, you might:
    // 1. Store in a database (PostgreSQL, MongoDB, etc.)
    // 2. Send to a logging service (Datadog, Sentry, etc.)
    // 3. Stream to analytics (Amplitude, Mixpanel, etc.)

    // For now, we return success and let the client handle storage
    return NextResponse.json(
      {
        success: true,
        message: "Telemetry data received",
        dataPoint: telemetryPoint,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[Telemetry API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to process telemetry data",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/collect
 * Returns API status and usage information
 */
export async function GET() {
  return NextResponse.json({
    status: "operational",
    version: "1.0.0",
    endpoints: {
      POST: {
        description: "Submit telemetry data",
        requiredFields: ["type", "data"],
        optionalFields: ["sessionId", "timestamp", "tags", "userAgent", "url"],
        example: {
          type: "memory",
          data: {
            usedJSHeapSize: 12345678,
            totalJSHeapSize: 23456789,
            jsHeapSizeLimit: 34567890,
          },
          sessionId: "session_123",
          timestamp: Date.now(),
          tags: { environment: "production", version: "1.0.0" },
        },
      },
    },
    documentation: "https://github.com/buglet/docs/telemetry-api",
  })
}

/**
 * OPTIONS /api/collect
 * CORS preflight handler
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
