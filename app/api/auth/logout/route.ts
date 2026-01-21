import { supabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

const supabase = supabaseServer()

export async function POST() {
  try {
    const response = NextResponse.redirect("/login");

    response.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
    response.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });

    await supabase.auth.signOut();

    return response;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}