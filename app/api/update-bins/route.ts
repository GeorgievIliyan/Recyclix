import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

// Supabase server client със service role ключ
export const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: Request) {
  // защита срещу нежелани заявки
  const token = req.headers.get('x-api-token')
  
  if (!token || token !== process.env.SECURE_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  // Overpass QL заявка за всички рециклиращи кошчета в България
  const query = `
    [out:json][timeout:600];
    area["ISO3166-1"="BG"]->.searchArea;
    (
      node["amenity"="recycling"](area.searchArea);
      way["amenity"="recycling"](area.searchArea);
    );
    out body center;
  `;

  try {
    // Изпращане на заявка към Overpass API
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
    });

    // Вземаме raw текста от отговора
    const text = await res.text();

    // Опит за парсване като JSON
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Overpass е върнал HTML/XML (грешка или rate limit)
      console.error("Overpass не върна JSON:", text);
      return NextResponse.json(
        { error: "Overpass не върна валиден JSON" },
        { status: 500 }
      );
    }

    // Подготовка на данните за запис в Supabase
    const bins = data.elements
      .map((el: any) => ({
        osm_id: el.id.toString(),
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
        tags: el.tags ?? {},
        code: nanoid(6),
      }))
      // Филтър срещу невалидни координати
      .filter(
        (b: any) =>
          typeof b.lat === "number" && typeof b.lon === "number"
      );

    // Upsert по osm_id (без дублиране)
    const { error } = await supabaseServer
      .from("recycling_bins")
      .upsert(bins, { onConflict: "osm_id" });

    if (error) {
      console.error("Supabase upsert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Успешен отговор
    return NextResponse.json({
      inserted: bins.length,
    });
  } catch (err: any) {
    console.error("Грешка при Overpass заявката:", err);
    return NextResponse.json(
      { error: "Грешка при Overpass заявката" },
      { status: 500 }
    );
  }
}