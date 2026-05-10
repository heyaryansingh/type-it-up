import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

/**
 * Health check endpoint with performance monitoring
 *
 * Verifies:
 * - Database connectivity and response time
 * - API runtime environment
 * - System uptime
 *
 * Returns detailed health status and metrics
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const dbCheckStart = Date.now();

    // Test database connectivity with a simple query
    const { error } = await supabase.rpc("now", {});

    // If rpc doesn't work, try a raw SQL query
    if (error) {
      const { error: timeError } = await supabase
        .from("_supabase_health_check")
        .select("*")
        .limit(1);

      // If table doesn't exist, that's fine - connection works
      if (timeError && !timeError.message.includes("relation") && !timeError.message.includes("does not exist")) {
        throw timeError;
      }
    }

    const dbLatency = Date.now() - dbCheckStart;
    const totalLatency = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      status: "ok",
      database: {
        status: "connected",
        latency_ms: dbLatency
      },
      performance: {
        total_latency_ms: totalLatency,
        db_latency_ms: dbLatency
      },
      environment: {
        node_version: process.version,
        platform: process.platform
      },
      timestamp,
    });
  } catch (error) {
    const totalLatency = Date.now() - startTime;
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: {
          status: "disconnected",
          error: error instanceof Error ? error.message : "Unknown error"
        },
        performance: {
          total_latency_ms: totalLatency
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
