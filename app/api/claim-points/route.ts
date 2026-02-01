import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization" },
        { status: 401, headers: corsHeaders }
      );
    }

    const userToken = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(userToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired user session" },
        { status: 401, headers: corsHeaders }
      );
    }

    const { qrToken } = await req.json();

    if (!qrToken) {
      return NextResponse.json(
        { error: "Missing QR token" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: qrRecord, error: qrError } = await supabaseAdmin
      .from("temporary_qrs")
      .select("id, points, expires_at")
      .eq("token", qrToken)
      .single();

    if (qrError || !qrRecord) {
      return NextResponse.json(
        { error: "Invalid QR token" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (new Date() > new Date(qrRecord.expires_at)) {
      return NextResponse.json(
        { error: "QR token has expired" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const newTotal = (profile.points || 0) + qrRecord.points;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ points: newTotal })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update points" },
        { status: 500, headers: corsHeaders }
      );
    }

    await supabaseAdmin
      .from("temporary_qrs")
      .delete()
      .eq("id", qrRecord.id);

    return NextResponse.json(
      {
        success: true,
        pointsAwarded: qrRecord.points,
        newTotal,
        message: `Успешно получихте ${qrRecord.points} точки!`,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Use POST to claim points",
      body: { qrToken: "string" },
    },
    { headers: corsHeaders }
  );
}
