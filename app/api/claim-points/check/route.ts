import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-browser";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ status: "invalid" }, { status: 400 });

  try {
    const { data, error } = await supabase
      .from("temporary_qrs")
      .select("id, points, expires_at, is_claimed")
      .eq("token", token)
      .maybeSingle();

    if (error || !data)
      return NextResponse.json({ status: "invalid" }, { status: 404 });

    if (data.is_claimed) return NextResponse.json({ status: "claimed" });

    if (new Date() > new Date(data.expires_at))
      return NextResponse.json({ status: "expired" });

    return NextResponse.json({ status: "valid", points: data.points });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
