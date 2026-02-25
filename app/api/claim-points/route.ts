import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CORS хедъри — позволяват заявки от мобилното приложение и други произходи
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

// Отговаря на preflight CORS заявки от браузъра
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Проверка на автентикацията ─────────────────────────────────────────
    // Изискваме Bearer токен в Authorization хедъра
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Липсва или е невалиден Authorization хедър" },
        { status: 401, headers: corsHeaders },
      );
    }

    const userToken = authHeader.replace("Bearer ", "");

    // Верифицираме токена и взимаме потребителя от Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(userToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Невалидна или изтекла потребителска сесия" },
        { status: 401, headers: corsHeaders },
      );
    }

    // ── 2. Валидация на QR токена от тялото на заявката ──────────────────────
    const { qrToken } = await req.json();
    if (!qrToken) {
      return NextResponse.json(
        { error: "Липсва QR токен" },
        { status: 400, headers: corsHeaders },
      );
    }

    // ── 3. Търсене на QR записа в базата данни ────────────────────────────────
    const { data: qrRecord, error: qrError } = await supabaseAdmin
      .from("temporary_qrs")
      .select("id, points, expires_at")
      .eq("token", qrToken)
      .single();

    if (qrError || !qrRecord) {
      return NextResponse.json(
        { error: "Невалиден QR токен" },
        { status: 400, headers: corsHeaders },
      );
    }

    // ── 4. Проверка дали QR кодът не е изтекъл ───────────────────────────────
    if (new Date() > new Date(qrRecord.expires_at)) {
      return NextResponse.json(
        { error: "QR токенът е изтекъл" },
        { status: 400, headers: corsHeaders },
      );
    }

    // ── 5. Зареждане на потребителския профил от user_profiles ───────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("xp")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Потребителският профил не е намерен" },
        { status: 404, headers: corsHeaders },
      );
    }

    // ── 6. Изчисляване на новия XP и ниво ────────────────────────────────────
    const newXp = (profile.xp ?? 0) + qrRecord.points;
    const { level: newLevel } = computeLevelFromXp(newXp);

    // ── 7. Записване на новия XP и ниво в профила ────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Неуспешно обновяване на XP точките" },
        { status: 500, headers: corsHeaders },
      );
    }

    // ── 8. Изтриване на QR кода след успешно използване ──────────────────────
    // QR кодовете са еднократни — изтриваме го за да не може да се използва повторно
    await supabaseAdmin.from("temporary_qrs").delete().eq("id", qrRecord.id);

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
    return NextResponse.json(
      { error: "Вътрешна сървърна грешка", details: err.message },
      { status: 500, headers: corsHeaders },
    );
  }
}

// Информационен GET endpoint — обяснява как се използва route-а
export async function GET() {
  return NextResponse.json(
    {
      message: "Използвай POST за да получиш точки",
      body: { qrToken: "string" },
    },
    { headers: corsHeaders },
  );
}