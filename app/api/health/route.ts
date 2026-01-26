import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = await createClient();

    // Test database connectivity with a simple query
    const { data, error } = await supabase.rpc("now", {});

    // If rpc doesn't work, try a raw SQL query
    if (error) {
      const { data: timeData, error: timeError } = await supabase
        .from("_supabase_health_check")
        .select("*")
        .limit(1);

      // If table doesn't exist, that's fine - connection works
      if (timeError && !timeError.message.includes("relation") && !timeError.message.includes("does not exist")) {
        throw timeError;
      }
    }

    const timestamp = new Date().toISOString();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp,
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
