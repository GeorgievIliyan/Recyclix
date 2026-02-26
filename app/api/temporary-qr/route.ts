import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Настройка на Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const isDev = process.env.NODE_ENV === "development";

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
  // Проверка на API токена против нежелани заявки
  const token = req.headers.get("x-api-token");

  if (!isDev) {
    if (!token || token !== process.env.NEXT_PUBLIC_SECURE_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Взимаме потребителя от Bearer токена ако е наличен
    // Нужен е за да запишем user_id в QR записа — после го използваме при вземане на точките
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (isDev) console.log("[temporary-qr] Authorization хедър:", authHeader ? "присъства" : "липсва");

    if (authHeader?.startsWith("Bearer ")) {
      const userToken = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(userToken);
      if (user) userId = user.id;
      if (isDev) console.log("[temporary-qr] Извлечен userId:", userId ?? "null — токенът е невалиден");
    }

    const body = await req.json();

    // Валидация на входните данни
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
        { status: 400 },
      );
    }

    const {
      points: rawPoints,
      binCode: codeFromBinCode,
      binId: codeFromBinId,
    } = parsed.data;
    const points = rawPoints ?? 10; // Стандартни 10 точки ако не е подадено
    const binCode = codeFromBinCode || codeFromBinId;

    // Генериране на уникален QR токен и срок на валидност (5 минути)
    const qrToken = nanoid(12);
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    // Подготовка на данни за вмъкване — записваме user_id за да знаем на кого да дадем точките
    const insertData: Record<string, any> = {
      token: qrToken,
      points,
      expires_at: expiresAt,
      user_id: userId,
    };
    if (binCode) insertData.code = binCode;

    // Вмъкване в таблицата temporary_qrs
    const { error } = await supabase.from("temporary_qrs").insert(insertData);

    if (error) {
      console.error("Supabase insert error:", error);
      // Опит без code колоната ако има проблем с нея
      if (error.message.includes("code") || error.message.includes("column")) {
        console.log("Retrying without code column...");
        const { error: retryError } = await supabase
          .from("temporary_qrs")
          .insert({ token: qrToken, points, expires_at: expiresAt, user_id: userId });
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const qrUrl = `${baseUrl}/app/claim?token=${qrToken}`;

    if (isDev) {
      console.log("[temporary-qr] QR генериран:", {
        points,
        binCode,
        fullBody: body,
        qrUrl,
        userId,
      });
      console.log("[temporary-qr] Full QR URL:", qrUrl);
    }

    return NextResponse.json({
      success: true,
      token: qrToken,
      qrUrl: qrUrl,
      expiresAt,
    });
  } catch (err: any) {
    console.error("Temporary QR route error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        // Authorization добавен — нужен е за да се прати Bearer токена
        "Access-Control-Allow-Headers": "Content-Type, x-api-token, Authorization",
      },
    },
  );
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
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