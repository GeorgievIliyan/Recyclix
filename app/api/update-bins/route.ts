import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

// Вземаме текущата среда (development / production)
const state = process.env.NODE_ENV;

// Създаваме сървърен Supabase клиент с service key
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  // Ако не сме в development среда, проверяваме x-api-key заглавие
  if (state !== "development") {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.SECURE_API_KEY) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }
  }

  // Overpass QL заявка за България
  const query = `
    [out:json][timeout:300];
    area["name"="България"]["boundary"="administrative"]->.searchArea;
    (
      node["amenity"="recycling"](area.searchArea);
      way["amenity"="recycling"](area.searchArea);
      rel["amenity"="recycling"](area.searchArea);
      node["recycling"="yes"](area.searchArea);
      way["recycling"="yes"](area.searchArea);
      node["waste"="recycling"](area.searchArea);
      way["waste"="recycling"](area.searchArea);
    );
    out body center;
  `;

  try {
    // Изпращаме POST заявката към Overpass API
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded", // задължително
      },
      body: new URLSearchParams({ data: query }), // query се изпраща като form data
    });

    // Парсваме отговора като JSON
    const data = await res.json();

    // Форматиране на кошчетата за Supabase
    const bins = data.elements.map((el: any) => ({
      osm_id: el.id.toString(),
      lat: el.lat ?? el.center?.lat, // ако е way/rel вземаме center
      lon: el.lon ?? el.center?.lon,
      tags: el.tags ?? {},
      code: nanoid(6),
    }));

    // Записваме или обновяваме в Supabase (upsert)
    const { error } = await supabaseServer
      .from("recycling_bins")
      .upsert(bins, { onConflict: "osm_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Успешен отговор
    return NextResponse.json({ inserted: bins.length });
  } catch (err: any) {
    console.error("Грешка при Overpass заявка:", err);
    return NextResponse.json({ error: "Грешка при Overpass заявка" }, { status: 500 });
  }
}
