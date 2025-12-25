import { supabase } from "@/lib/supabase-browser";
import { NextRequest, NextResponse } from "next/server";

interface AuthBody {
  email?: string;
  password?: string;
  fullName?: string;
}

const redirectTo = process.env.NEXT_URL;

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName }: AuthBody = await req.json();

    let userId: string | null = null;

    // Вписване чрез емайл и парола
    if (email && password) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${redirectTo}/auth/login`
        }
      });
			// при грешки
      if (signUpError || !signUpData.user) {
        return NextResponse.json({ error: signUpError?.message || "Signup failed" }, { status: 400 });
      }

      userId = signUpData.user.id;
    }

    // Използване на OAuth
    if (!userId) {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) {
        return NextResponse.json({ error: sessionError?.message || "No user logged in" }, { status: 400 });
      }
      userId = user.id;
    }

    // създаване на потребителски профил
    const { data: profileData, error: profileError } = await supabase.rpc('create_user_profile', { p_user: userId });
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ userId, profile: profileData }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}