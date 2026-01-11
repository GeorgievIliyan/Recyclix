"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Bin } from "@/app/components/MapComponent";
import { supabase } from "@/lib/supabase-browser";

const MapComponent = dynamic(
  () => import("@/app/components/MapComponent"),
  { ssr: false }
);

export async function getBins(): Promise<Bin[]> {
  const pageSize = 1000;
  let allBins: Bin[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("recycling_bins")
      .select("id, lat, lon, tags")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const mapped: Bin[] = (data ?? []).map(d => ({
      id: d.id,
      lat: d.lat,
      lon: d.lon,
      tags: d.tags,
      osm_type: "node"
    }));

    allBins.push(...mapped);

    if (!data || data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allBins;
}

export default function MapPage() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBins()
      .then(setBins)
      .catch(err => setError(err.message));
  }, []);

  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <main className="p-4 dark:bg-neutral-950">

      <div className="h-screen w-full border">
        <MapComponent bins={bins} jawgApiKey={process.env.NEXT_PUBLIC_JAWG_KEY}/>
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Показване на {bins.length} локации
      </p>
    </main>
  );
}