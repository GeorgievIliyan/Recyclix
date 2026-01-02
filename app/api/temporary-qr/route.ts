import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Настройка на Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SNEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const points = body.points ?? 10; // Стандартни 10 точки, ако не са подадени

    // Опитваме се да вземем кода на контейнера (bin) от различни възможни полета
    const binCode = body.binCode || body.binId; // Приемаме и binCode и binId

    console.log("QR API Request:", { points, binCode, fullBody: body });

    // Генериране на уникален QR токен и срок на валидност
    const token = nanoid(12);
    const expiresAt = new Date(Date.now() + 120 * 1000).toISOString(); // 2 минути валидност

    // Подготовка на данни за вмъкване в Supabase
    const insertData: any = {
      token,
      points,
      expires_at: expiresAt,
    };

    // Добавяме кода само ако го имаме и съществува колоната
    if (binCode) {
      insertData.code = binCode;
    }

    // Опит за вмъкване в таблицата temporary_qrs
    const { error } = await supabase.from("temporary_qrs").insert(insertData);

    if (error) {
      console.error("Supabase insert error:", error);

      // Ако има грешка за липсваща колона "code", пробваме без нея
      if (error.message.includes("code") || error.message.includes("column")) {
        console.log("Retrying without code column...");

        const { error: retryError } = await supabase.from("temporary_qrs").insert({
          token,
          points,
          expires_at: expiresAt,
        });

        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Успешен отговор с QR токен и време на изтичане
    return NextResponse.json({
      success: true,
      token,
      expiresAt,
    });
  } catch (err: any) {
    console.error("Temporary QR route error:", err);
    return NextResponse.json({
      error: err.message || "Unknown error",
    }, { status: 500 });
  }
}