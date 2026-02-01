import { NextResponse, NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { isDev } from "@/lib/isDev";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ status: "invalid" }, { status: 400 });

  try {
    // Check if token exists and status
    const { data, error } = await supabase
      .from("temporary_qrs")
      .select("id, points, expires_at, is_claimed, code, created_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ status: "invalid" }, { status: 404 });

    // Check if already claimed
    if (data.is_claimed === true) {
      return NextResponse.json({ 
        status: "claimed",
        claimedAt: data.created_at,
        code: data.code
      });
    }

    // Check expiry
    const expiresAt = new Date(data.expires_at);
    if (new Date() > expiresAt) {
      await supabase.from("temporary_qrs").delete().eq("id", data.id);
      return NextResponse.json({ status: "expired", expiredAt: expiresAt.toISOString() });
    }

    // Mark as claimed immediately upon scanning (GET request)
    await supabase
      .from("temporary_qrs")
      .update({ is_claimed: true })
      .eq("id", data.id);

    return NextResponse.json({
      status: "valid",
      points: data.points,
      expiresAt: expiresAt.toISOString(),
      id: data.id,
      code: data.code
    });

  } catch (error) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, binCode } = await req.json();
    if (!token) return NextResponse.json({ status: "error", message: "Token required" }, { status: 400 });

    // Update the record with the final code
    // We filter by code is null to ensure a token's data is only finalized once
    const { data, error } = await supabase
      .from("temporary_qrs")
      .update({ 
        is_claimed: true,
        code: binCode || null 
      })
      .eq("token", token)
      .is("code", null) 
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "error", message: "Already finalized or invalid" }, { status: 409 });
    }

    return NextResponse.json({
      status: "success",
      points: data.points
    });

  } catch (error) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function PUT() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export async function PATCH() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }