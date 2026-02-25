import { isDev } from "@/lib/isDev";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Административен Supabase клиент — използва service key за да заобиколи RLS политиките
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

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
    const body = await req.json();

    if (isDev) console.log("API /recycling/log получи заявка:", body);

    const { material, points, co2_saved, user_id, count, weight_kg } = body;

    // Проверка дали всички задължителни полета са подадени
    if (!material || points === undefined || co2_saved === undefined || !user_id) {
      const errorMsg = `Липсват задължителни полета. Получено: ${JSON.stringify(body)}`;
      if (isDev) console.error("Грешка при валидация:", errorMsg);
      return NextResponse.json({ error: "Липсват задължителни полета", details: errorMsg }, { status: 400 });
    }

    // ── 1. Записване на събитието за рециклиране ──────────────────────────────
    const { data, error: insertError } = await supabaseAdmin
      .from("recycling_events")
      .insert({
        user_id,
        material,
        points,
        co2_saved,
        count: count || 1, // Ако броят не е подаден, приемаме 1 артикул
        weight_kg,
      })
      .select();

    if (insertError) {
      if (isDev) console.error("Грешка при запис в Supabase:", insertError);
      return NextResponse.json({ error: "Неуспешен запис в базата данни", details: insertError.message }, { status: 500 });
    }

    if (isDev) console.log("Успешно записано събитие за рециклиране:", data);

    // ── 2. Обновяване на XP точките на потребителя ────────────────────────────
    // Взимаме текущия XP преди да добавим новите точки
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("xp")
      .eq("id", user_id)
      .single();

    if (profileError) {
      // не спираме заявката — събитието за рециклиране вече е записано успешно
      if (isDev) console.error("Неуспешно зареждане на потребителски профил за обновяване на XP:", profileError);
    } else {
      const newXp = (profile?.xp ?? 0) + points;
      const { level: newLevel } = computeLevelFromXp(newXp);

      const { error: xpError } = await supabaseAdmin
        .from("user_profiles")
        .update({
          xp: newXp,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (xpError) {
        // при грешка
        if (isDev) console.error("Неуспешно обновяване на XP:", xpError);
      } else {
        if (isDev) console.log(`XP обновен за потребител ${user_id}: +${points} точки → общо ${newXp} XP (ниво ${newLevel})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Събитието за рециклиране е записано успешно",
      inserted: data,
    });
  } catch (error: any) {
    if (isDev) console.error("Вътрешна грешка в API:", error);
    return NextResponse.json({ error: "Вътрешна сървърна грешка", details: error.message }, { status: 500 });
  }
}