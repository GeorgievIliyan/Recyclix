import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Supabase клиент с ключ
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Схема за валидация
const ApiTokenSchema = z.object({
  token: z.string().min(1, "API token is required"),
});

export async function GET(request: NextRequest) {
  // Валидация на докен
  const tokenHeader = request.headers.get("x-api-token");
  const parsed = ApiTokenSchema.safeParse({ token: tokenHeader });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 401 }
    );
  }

  // Проверка на токен
  if (parsed.data.token !== process.env.SECURE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data.users });
  } catch (err: any) {
    console.error("Error fetching users:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}