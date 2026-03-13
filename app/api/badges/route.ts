import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id");
    const onlyActive = searchParams.get("is_active") !== "false";

    // взимане на всички значки
    let query = supabase.from("badges").select("*");
    if (onlyActive) query = query.eq("is_active", true);

    const { data: badges, error: badgesError } = await query;
    if (badgesError) throw badgesError;

    // ако няма потребител, връщаме всички значки като заключени
    if (!userId) {
      const result = badges.map((badge) => ({
        ...badge,
        id: Number(badge.id),
        locked: true,
        progress: 0,
      }));
      return NextResponse.json(result);
    }

    // взимане на потребителските постижения
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("badges")
      .eq("id", userId)
      .maybeSingle();

    let earnedIds: number[] = [];
    if (profile?.badges) {
      const badgesArray = Array.isArray(profile.badges)
        ? profile.badges
        : JSON.parse(profile.badges || "[]");
      earnedIds = badgesArray
        .map((id: any) => Number(id))
        .filter((id: number) => !isNaN(id) && id > 0);
    }

    // взимане на всички recycling_events за потребителя
    const { data: events } = await supabase
      .from("recycling_events")
      .select("co2_saved, material, created_at")
      .eq("user_id", userId);

    const allEvents = events ?? [];

    // --- изчисления ---

    // badges 1, 2, 3 — общо co2_saved
    const totalCo2 = allEvents.reduce(
      (sum, row) => sum + Number(row.co2_saved ?? 0),
      0,
    );

    // badges 4, 5, 6 — стъклени събития
    const glassEvents = allEvents.filter((e) => e.material === "glass_metal");
    const glassCount = glassEvents.length;

    // badge 5 — максимална поредица от последователни дни
    const glassDays = [
      ...new Set(
        glassEvents.map((e) =>
          new Date(e.created_at).toISOString().slice(0, 10),
        ),
      ),
    ].sort();

    let maxStreak = glassDays.length > 0 ? 1 : 0;
    let currStreak = glassDays.length > 0 ? 1 : 0;

    for (let i = 1; i < glassDays.length; i++) {
      const prev = new Date(glassDays[i - 1]);
      const curr = new Date(glassDays[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;

      if (diffDays === 1) {
        currStreak++;
        if (currStreak > maxStreak) maxStreak = currStreak;
      } else {
        currStreak = 1;
      }
    }

    // прогрес по значка
    const progressMap: Record<number, number> = {
      1: Math.min(100, Math.round((totalCo2 / 10) * 100)),
      2: Math.min(100, Math.round((totalCo2 / 50) * 100)),
      3: Math.min(100, Math.round((totalCo2 / 250) * 100)),
      4: Math.min(100, Math.round((glassCount / 15) * 100)),
      5: Math.min(100, Math.round((maxStreak / 7) * 100)),
      6: Math.min(100, Math.round((glassCount / 100) * 100)),
    };

    // създаване на крайния резултат
    const result = badges.map((badge) => {
      const badgeId = Number(badge.id);
      const isEarned = earnedIds.includes(badgeId);
      const progress = progressMap[badgeId] ?? (isEarned ? 100 : undefined);

      return {
        ...badge,
        id: badgeId,
        locked: !isEarned,
        progress,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch badges" },
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