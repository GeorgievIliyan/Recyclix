import { isDev } from "@/lib/isDev";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (isDev) {
      console.log("API /recycling/log received:", body);
    }
    
    const { material, points, co2_saved, user_id } = body;

    if (!material || points === undefined || co2_saved === undefined || !user_id) {
      const errorMsg = `Missing required fields. Received: ${JSON.stringify(body)}`;
      if (isDev) console.log("Validation error:", errorMsg);
      return NextResponse.json({ 
        error: "Missing required fields",
        details: errorMsg
      }, { status: 400 });
    }

    if (isDev) {
      console.log("Attempting to insert into recycling_events:", {
        user_id,
        material,
        points,
        co2_saved
      });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('recycling_events')
      .insert({
        user_id: user_id,
        material: material,
        points: points,
        co2_saved: co2_saved
      })
      .select();

    if (insertError) {
      if (isDev) console.error("DB Insert Error:", insertError);
      return NextResponse.json({ 
        error: "Database insert failed",
        details: insertError.message 
      }, { status: 500 });
    }

    if (isDev) {
      console.log("Successfully inserted:", data);
    }

    return NextResponse.json({ 
      success: true,
      message: "Recycling event logged successfully",
      inserted: data
    });

  } catch (error: any) {
    if (isDev) {
      console.log("Error while trying to create a recycling event:", error);
    }
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error.message 
    }, { status: 500 });
  }
}