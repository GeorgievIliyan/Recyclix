import { isDev } from "@/lib/isDev";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      console.log("API /recycling/log received:", body);
    }

    const { material, points, co2_saved, user_id, count } = body;

    if (
      !material ||
      points === undefined ||
      co2_saved === undefined ||
      !user_id
    ) {
      const errorMsg = `Missing required fields. Received: ${JSON.stringify(body)}`;
      if (isDev) console.error("Validation error:", errorMsg);

      return NextResponse.json(
        {
          error: "Missing required fields",
          details: errorMsg,
        },
        { status: 400 },
      );
    }
    const { data, error: insertError } = await supabaseAdmin
      .from("recycling_events")
      .insert({
        user_id: user_id,
        material: material,
        points: points,
        co2_saved: co2_saved,
        count: count || 1,
      })
      .select();

    if (insertError) {
      if (isDev) console.error("Supabase Insert Error:", insertError);
      return NextResponse.json(
        {
          error: "Database insert failed",
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    if (isDev) {
      console.log("Successfully inserted row:", data);
    }

    return NextResponse.json({
      success: true,
      message: "Recycling event logged successfully",
      inserted: data,
    });
  } catch (error: any) {
    if (isDev) {
      console.error("Internal API Error:", error);
    }
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
