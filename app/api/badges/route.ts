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
      }));
      return NextResponse.json(result);
    }

    // взимане на потребителските постижения
    const { data: profile, error: profileError } = await supabase
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

    // създаване на крайния резултат
    const result = badges.map((badge) => {
      const badgeId = Number(badge.id);
      const isEarned = earnedIds.includes(badgeId);

      return {
        ...badge,
        id: badgeId,
        locked: !isEarned,
      };
    });

    const unlocked = result.filter((b) => !b.locked).length;

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
