import { supabase } from "@/lib/supabase-browser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const redirectTo = process.env.NEXT_URL;
const AuthBodySchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AuthBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const { email, password, fullName } = parsed.data;

    let userId: string | null = null;

    if (email && password) {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${redirectTo}/auth/login`,
          },
        });

      if (signUpError || !signUpData.user) {
        return NextResponse.json(
          { error: signUpError?.message || "Signup failed" },
          { status: 400 },
        );
      }

      userId = signUpData.user.id;
    }

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "No userId available. OAuth flow not supported server-side in this route.",
        },
        { status: 400 },
      );
    }

    const { data: profileData, error: profileError } = await supabase.rpc(
      "create_user_profile",
      { p_user: userId },
    );

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ userId, profile: profileData }, { status: 200 });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
