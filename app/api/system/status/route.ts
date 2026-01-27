import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { healthCheck as mlHealthCheck } from "@/lib/ml-client";

interface ServiceCheck {
  status: "ok" | "error" | "unknown";
  message: string;
}

export async function GET() {
  const checks: Record<string, ServiceCheck> = {
    database: { status: "unknown", message: "" },
    storage: { status: "unknown", message: "" },
    ml_service: { status: "unknown", message: "" },
  };

  // Check database
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("_supabase_health_check")
      .select("*")
      .limit(1);

    // Table doesn't exist yet, but connection works if we get specific error
    if (error && !error.message.includes("does not exist") && !error.message.includes("relation")) {
      checks.database = { status: "error", message: error.message };
    } else {
      checks.database = { status: "ok", message: "Connected" };
    }
  } catch (err) {
    checks.database = {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check storage - verify env vars are configured
  try {
    const storageConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (storageConfigured) {
      checks.storage = { status: "ok", message: "Configured (Supabase Storage)" };
    } else {
      checks.storage = { status: "error", message: "Storage not configured" };
    }
  } catch (err) {
    checks.storage = {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check ML service
  try {
    if (!process.env.HF_SPACE_URL && !process.env.NEXT_PUBLIC_HF_SPACE_URL) {
      checks.ml_service = { status: "error", message: "HF_SPACE_URL not configured" };
    } else {
      const health = await mlHealthCheck();
      checks.ml_service = {
        status: "ok",
        message: `${health.model} v${health.version}`,
      };
    }
  } catch (err) {
    checks.ml_service = {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const allHealthy = Object.values(checks).every((check) => check.status === "ok");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      services: checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
