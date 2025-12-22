import { NextRequest, NextResponse } from 'next/server'
// параметри | query params
const query = `
[out:json][timeout:60];

area["name"="Варна"]["admin_level"="8"]->.searchArea;

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
  try {
    const bins = await fetchBins();
    return NextResponse.json({ bins });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}