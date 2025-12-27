import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// клиент за база данни
export const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
);

export async function GET() {
    // заява до сървър за локациите на кошовете
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
    `
    // отговор на сървъра
    const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
    })
    // преобразуване в JSON
    const data = await res.json()
    // масив с кошовете
    const bins = data.elements.map((el:any) => ({
        osm_id: el.id.toString(),
        lat: el.lat,
        lon: el.lon,
        tags: el.tags ?? {},
    }))
    // при грешки
    const { error } = await supabaseServer
    .from("recycling_bins")
    .upsert(bins, {onConflict: "osm_id"})

    if (error){
        return NextResponse.json({error: error.message}, {status: 500})
    }
    // връщане на отговор
    return NextResponse.json({inserted: bins.length})
}