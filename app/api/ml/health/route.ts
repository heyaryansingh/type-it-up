import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/ml-client";

export async function GET() {
  try {
    const health = await healthCheck();

    return NextResponse.json({
      status: "ok",
      ml_service: "connected",
      model: health.model,
      version: health.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ML health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        ml_service: "disconnected",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
