import { type NextRequest, NextResponse } from "next/server"

/**
 * GET /api/export?sessionId=xxx&format=json
 * Export telemetry data for a session
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("sessionId")
    const format = searchParams.get("format") || "json"

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    // In a real implementation, fetch from database
    // For now, return instructions for client-side export
    const exportData = {
      message: "Use the telemetry bridge library's exportSessionData() function to export session data client-side.",
      sessionId,
      format,
      example: {
        version: "1.0.0",
        exportTime: Date.now(),
        session: {},
        dataPoints: [],
        recordings: [],
      },
    }

    if (format === "csv") {
      // Return CSV format instructions
      return NextResponse.json({
        ...exportData,
        csvFormat: "timestamp,type,sessionId,data\n...",
      })
    }

    return NextResponse.json(exportData, { status: 200 })
  } catch (error: any) {
    console.error("[Export API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to export data",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
