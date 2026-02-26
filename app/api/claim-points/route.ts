import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CORS хедъри
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// админинстративен клиент
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const isDev = process.env.NODE_ENV === "development";

// Изчислява нивото на потребителя спрямо общия му XP
// Всяко ниво изисква 25% повече XP от предишното, започвайки от 100 XP за ниво 1
function computeLevelFromXp(totalXp: number) {
  let level = 1;
  let currentXp = totalXp;
  let xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  while (currentXp >= xpForNextLevel) {
    currentXp -= xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  }
  return { level, currentXp, xpForNextLevel };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Валидация на QR токена от тялото на заявката
    const { qrToken } = await req.json();
    if (isDev) console.log("[claim-points] Получен qrToken:", qrToken);

    if (!qrToken) {
      return NextResponse.json(
        { error: "Липсва QR токен" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 2. Атомарно маркиране на QR-а като използван
    // Обновяваме само ако is_claimed = false И не е изтекъл — предотвратява race conditions
    if (isDev) console.log("[claim-points] Търсим и маркираме QR токена...");
    const { data: qrRecord, error: claimError } = await supabaseAdmin
      .from("temporary_qrs")
      .update({ is_claimed: true })
      .eq("token", qrToken)
      .eq("is_claimed", false)
      .gt("expires_at", new Date().toISOString())
      .select("id, points, user_id")
      .single();

    if (isDev)
      console.log("[claim-points] QR запис:", qrRecord, "Грешка:", claimError);

    if (claimError || !qrRecord) {
      return NextResponse.json(
        { error: "Невалиден, изтекъл или вече използван QR токен" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 3. Проверка дали имаме user_id в QR записа
    if (isDev) console.log("[claim-points] user_id от QR:", qrRecord.user_id);

    if (!qrRecord.user_id) {
      return NextResponse.json(
        { error: "Не може да се определи потребителят за този QR код" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 4. Зареждане на потребителския профил
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("xp")
      .eq("id", qrRecord.user_id)
      .single();

    if (isDev)
      console.log("[claim-points] Профил:", profile, "Грешка:", profileError);

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Потребителският профил не е намерен" },
        { status: 404, headers: corsHeaders },
      );
    }

    // 5. Изчисляване на новия XP и ниво
    const newXp = (profile.xp ?? 0) + qrRecord.points;
    const { level: newLevel } = computeLevelFromXp(newXp);
    if (isDev)
      console.log("[claim-points] Нов XP:", newXp, "Ново ниво:", newLevel);

    // 6. Записване на новия XP и ниво в профила
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", qrRecord.user_id);

    if (updateError) {
      if (isDev)
        console.error(
          "[claim-points] Грешка при обновяване на XP:",
          updateError,
        );
      return NextResponse.json(
        { error: "Неуспешно обновяване на XP точките" },
        { status: 500, headers: corsHeaders },
      );
    }

    // 7. Запис в recycling_events за проследяване
    await supabaseAdmin.from("recycling_events").insert({
      user_id: qrRecord.user_id,
      material: "qr_scan",
      points: qrRecord.points,
      co2_saved: 0,
      count: 1,
    });

    if (isDev)
      console.log("[claim-points] Успешно! Дадени точки:", qrRecord.points);

    return NextResponse.json(
      {
        success: true,
        pointsAwarded: qrRecord.points,
        newTotal: newXp,
        newLevel,
        message: `Успешно получихте ${qrRecord.points} XP точки!`,
      },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    if (isDev) console.error("[claim-points] Вътрешна грешка:", err);
    return NextResponse.json(
      { error: "Вътрешна сървърна грешка", details: err.message },
      { status: 500, headers: corsHeaders },
    );
  }
}
