import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Настройка на Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TemporaryQRSchema = z.object({
  points: z
    .number()
    .int()
    .min(1, "Points must be at least 1")
    .max(100, "Points cannot exceed 100")
    .optional(),
  binCode: z.string().min(1).optional(),
  binId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  // против нежелани заявки
  const token = req.headers.get("x-api-token");
  const isDev = process.env.NODE_ENV === "development"

  if (!isDev){
    if (!token || token !== process.env.SECURE_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    // Валидация
    const parsed = TemporaryQRSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { points: rawPoints, binCode: codeFromBinCode, binId: codeFromBinId } = parsed.data;
    const points = rawPoints ?? 10; // Стандартни 10 точки
    const binCode = codeFromBinCode || codeFromBinId;

    console.log("QR API Request:", { points, binCode, fullBody: body });

    // Генериране на уникален QR токен и срок на валидност
    const qrToken = nanoid(12);
    const expiresAt = new Date(Date.now() + 120 * 1000).toISOString(); // 2 минути валидност

    // Подготовка на данни за вмъкване в Supabase
    const insertData: Record<string, any> = {
      token: qrToken,
      points,
      expires_at: expiresAt,
    };
    if (binCode) insertData.code = binCode;

    // Опит за вмъкване в таблицата temporary_qrs
    const { error } = await supabase.from("temporary_qrs").insert(insertData);

    if (error) {
      console.error("Supabase insert error:", error);
      if (error.message.includes("code") || error.message.includes("column")) {
        console.log("Retrying without code column...");
        const { error: retryError } = await supabase
          .from("temporary_qrs")
          .insert({ token: qrToken, points, expires_at: expiresAt });
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      token: qrToken,
      expiresAt,
    });
  } catch (err: any) {
    console.error("Temporary QR route error:", err);
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