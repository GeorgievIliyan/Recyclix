import { supabase } from '@/lib/supabase-browser';
import { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server'
// параметри | query params
const query = `
[out:json][timeout:300];

area["name"="България"]["boundary"="administrative"]->.searchArea;

(
  node["amenity"="recycling"](area.searchArea);
  way["amenity"="recycling"](area.searchArea);
  rel["amenity"="recycling"](area.searchArea);

  // Common alternative tags
  node["recycling"="yes"](area.searchArea);
  way["recycling"="yes"](area.searchArea);
  
  node["waste"="recycling"](area.searchArea);
  way["waste"="recycling"](area.searchArea);
);

out body center;
`;
// функция за взимане на локации | function for fetching locations
const fetchBins = async () => {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });

  if (!res.ok) {
    throw new Error(`Overpass API failed with status ${res.status}`);
  }

  const data = await res.json();

  const bins = data.elements.map((el: any) => ({
    id: el.id,
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
    tags: el.tags ?? {},
  }));

  return bins;
};
// GET фунцкия | GET function
export async function GET(req: NextRequest) {
  // против нежелани заявки
  const token = req.headers.get('x-api-token')
  
  if (!token || token !== process.env.SECURE_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const bins = await fetchBins();
    return NextResponse.json({ bins });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

interface Bin {
  id: number;
  lat: number
  lon: number
  tags: Record<string, any>
  osm_type: "node" | "way" | "relation"
}

async function storeBins(bins:Bin[]) {
  const { data, error } = await supabase
    .from('bins')
    .upsert(
      bins.map((b) => ({
        id: b.id,
        osm_type: b.osm_type,
        lat: b.lat,
        lon: b.lon,
        tags: b.tags,
        updated_at: new Date().toISOString(),
      })),
      {
        onConflict: 'id,osm_type',
      }
    );
    if (error) console.error('Supabase upsert error:', error);
    else console.log(`Upserted ${bins.length} bins`);
}