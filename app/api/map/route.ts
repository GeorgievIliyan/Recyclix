import { supabase } from '@/lib/supabase-browser';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BinSchema = z.object({
  id: z.number().int().positive(),
  lat: z.number().min(41.235).max(44.217),
  lon: z.number().min(22.357).max(28.609),
  osm_type: z.enum(["node", "way", "relation"]),
  tags: z.record(z.string(), z.any()).default({}),
});

const ApiTokenSchema = z.object({
  token: z.string().min(1, "API token is required"),
});

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

async function fetchBins() {
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
    osm_type: el.type,
  }));

  return bins;
}

async function storeBins(bins: unknown[]) {
  const validBins: z.infer<typeof BinSchema>[] = [];
  const errors: string[] = [];

  for (const bin of bins) {
    const parsed = BinSchema.safeParse(bin);
    if (parsed.success) validBins.push(parsed.data);
    else errors.push(`Bin ${JSON.stringify(bin)} failed validation: ${parsed.error.issues.map(i => i.message).join(', ')}`);
  }

  if (errors.length > 0) console.warn("Some bins failed validation:", errors.slice(0, 10));

  if (validBins.length === 0) throw new Error("No valid bins to insert");

  const { error } = await supabase
    .from('bins')
    .upsert(
      validBins.map(b => ({
        id: b.id,
        osm_type: b.osm_type,
        lat: b.lat,
        lon: b.lon,
        tags: b.tags,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id,osm_type' }
    );

  if (error) console.error("Supabase upsert error:", error);
  else console.log(`Upserted ${validBins.length} bins`);

  return validBins.length;
}

export async function GET(req: NextRequest) {
  const tokenHeader = req.headers.get('x-api-token');
  const parsedToken = ApiTokenSchema.safeParse({ token: tokenHeader });

  if (!parsedToken.success || parsedToken.data.token !== process.env.SECURE_API_KEY) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ...(parsedToken.success
          ? undefined
          : { details: parsedToken.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }),
      },
      { status: 401 }
    );
  }

  try {
    const bins = await fetchBins();
    const insertedCount = await storeBins(bins);

    return NextResponse.json({
      success: true,
      totalFetched: bins.length,
      totalInserted: insertedCount,
    });
  } catch (err: any) {
    console.error("Error in GET /bins:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}