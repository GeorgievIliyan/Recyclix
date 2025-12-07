import { supabaseBrowser } from "@/lib/supabase-browser";
import { NextRequest, NextResponse } from "next/server";

interface UserBody {
    email: string;
    password: string;
    fullName: string;
}

const redirectTo = process.env.NEXT_URL;

export async function POST(req: NextRequest) {
    try {
        const { email, password, fullName }: UserBody = await req.json();

        const { data, error } = await supabaseBrowser.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: `${redirectTo}/auth/login`
            }
        });



        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        return NextResponse.json({ user: data }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}