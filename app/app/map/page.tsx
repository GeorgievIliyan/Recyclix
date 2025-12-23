"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Bin } from "@/app/components/MapComponent";
import { supabase } from "@/lib/supabase-browser";

const MapComponent = dynamic(
  () => import("@/app/components/MapComponent"),
  { ssr: false }
);

async function getBins() {
  const { data, error } = await supabase
    .from("recycling_bins")
    .select("lat, lon, tags");

  if (error) throw error;
  return data as Bin[];
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
      <h1 className="text-xl font-bold mb-4">Recycling Points</h1>

      <div className="h-[500px] w-full border rounded-lg">
        <MapComponent bins={bins} />
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Showing {bins.length} locations
      </p>
    </main>
  );
}