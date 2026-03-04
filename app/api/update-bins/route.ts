import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { z } from "zod";

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const ApiTokenSchema = z.object({
  token: z.string().min(1, "API token is required"),
});

const OverpassElementSchema = z
  .object({
    id: z.number().int().positive("Invalid OSM ID"),
    lat: z
      .number()
      .min(41.235, "Latitude must be >= 41.235")
      .max(44.217, "Latitude must be <= 44.217")
      .optional(),
    lon: z
      .number()
      .min(22.357, "Longitude must be >= 22.357")
      .max(28.609, "Longitude must be <= 28.609")
      .optional(),
    center: z
      .object({
        lat: z
          .number()
          .min(41.235, "Center latitude must be >= 41.235")
          .max(44.217, "Center latitude must be <= 44.217"),
        lon: z
          .number()
          .min(22.357, "Center longitude must be >= 22.357")
          .max(28.609, "Center longitude must be <= 28.609"),
      })
      .optional(),
    tags: z.record(z.string(), z.any()).optional(),
  })
  .refine(
    (data) => {
      return (data.lat && data.lon) || (data.center?.lat && data.center?.lon);
    },
    { message: "Element must have valid coordinates" },
  );

const OverpassResponseSchema = z.object({
  elements: z
    .array(OverpassElementSchema)
    .max(10000, "Too many elements received"),
  generator: z.string().optional(),
  version: z.number().optional(),
  copyright: z.string().optional(),
});

const RecyclingBinSchema = z.object({
  osm_id: z.string().min(1, "OSM ID is required"),
  lat: z
    .number()
    .min(41.235, "Latitude must be within Bulgaria")
    .max(44.217, "Latitude must be within Bulgaria"),
  lon: z
    .number()
    .min(22.357, "Longitude must be within Bulgaria")
    .max(28.609, "Longitude must be within Bulgaria"),
  tags: z.record(z.string(), z.any()).default({}),
  code: z.string().length(6, "Code must be exactly 6 characters"),
  created_at: z
    .string()
    .datetime({ message: "Invalid datetime format for created_at" })
    .optional(),
  updated_at: z
    .string()
    .datetime({ message: "Invalid datetime format for updated_at" })
    .optional(),
});

const sanitize = {
  tags: (tags: Record<string, any>): Record<string, string> => {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(tags)) {
      if (typeof value === "string") {
        const sanitizedValue = value
          .replace(/[<>]/g, "")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          .substring(0, 255);

        const sanitizedKey = key
          .replace(/[^a-zA-Z0-9_:]/g, "")
          .substring(0, 50);

        if (sanitizedKey && sanitizedValue) {
          sanitized[sanitizedKey] = sanitizedValue;
        }
      }
    }
    return sanitized;
  },

  overpassQuery: (query: string): string => {
    if (!query.includes("[out:json]")) {
      throw new Error("Query must output JSON format");
    }
    if (!query.includes('area["ISO3166-1"="BG"]')) {
      throw new Error("Query must be limited to Bulgaria");
    }
    if (query.includes("; out meta;")) {
      throw new Error("Meta output not allowed");
    }
    if (query.length > 10000) {
      throw new Error("Query too large");
    }
    return query;
  },
};

function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ExistingBin = { osm_id: string; lat: number; lon: number };

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-api-token");
    const tokenValidation = ApiTokenSchema.safeParse({ token });

    const isDev = process.env.NODE_ENV === "development";

    if (!isDev) {
      if (!tokenValidation.success) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            details: tokenValidation.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 401 },
        );
      }
    }

    if (
      process.env.NODE_ENV !== "development" &&
      token !== process.env.SECURE_API_KEY
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingRows, error: fetchError } = await supabaseServer
      .from("recycling_bins")
      .select("osm_id, lat, lon");

    if (fetchError) {
      console.error("Failed to fetch existing bins:", fetchError.message);
      return NextResponse.json(
        { error: "Could not load existing bins from database" },
        { status: 500 },
      );
    }

    const existingBins: ExistingBin[] = existingRows ?? [];
    const existingOsmIds = new Set(existingBins.map((b) => b.osm_id));

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
      const sanitizedQuery = sanitize.overpassQuery(query);

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: sanitizedQuery }),
      });

      if (res.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }

      if (!res.ok) {
        throw new Error(`Overpass API responded with status: ${res.status}`);
      }

      const text = await res.text();
      const contentType = res.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        console.error(
          "Overpass returned non-JSON response:",
          text.substring(0, 500),
        );
        return NextResponse.json(
          { error: "Overpass did not return valid JSON" },
          { status: 500 },
        );
      }

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(text);
      } catch {
        console.error(
          "Overpass returned invalid JSON:",
          text.substring(0, 500),
        );
        return NextResponse.json(
          { error: "Overpass did not return valid JSON" },
          { status: 500 },
        );
      }

      const validationResult = OverpassResponseSchema.safeParse(parsedData);
      if (!validationResult.success) {
        console.error(
          "Overpass response validation failed:",
          validationResult.error.issues,
        );
        return NextResponse.json(
          {
            error: "Invalid Overpass response format",
            details: validationResult.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 500 },
        );
      }

      const data = validationResult.data;
      const bins: z.infer<typeof RecyclingBinSchema>[] = [];
      const errors: string[] = [];

      const stagedBins: { lat: number; lon: number }[] = [];

      let skippedExisting = 0;
      let skippedProximity = 0;

      for (const element of data.elements) {
        try {
          const lat = element.lat ?? element.center?.lat;
          const lon = element.lon ?? element.center?.lon;

          if (!lat || !lon) {
            errors.push(`Element ${element.id} missing coordinates`);
            continue;
          }

          const osmId = element.id.toString();

          if (existingOsmIds.has(osmId)) {
            skippedExisting++;
            continue;
          }

          const tooClose =
            existingBins.some(
              (b) => haversineMetres(lat, lon, b.lat, b.lon) < 5,
            ) ||
            stagedBins.some((b) => haversineMetres(lat, lon, b.lat, b.lon) < 5);

          if (tooClose) {
            skippedProximity++;
            continue;
          }

          const sanitizedTags = element.tags ? sanitize.tags(element.tags) : {};

          const bin = RecyclingBinSchema.parse({
            osm_id: osmId,
            lat,
            lon,
            tags: sanitizedTags,
            code: nanoid(6),
          });

          bins.push(bin);
          stagedBins.push({ lat, lon });
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              `Element ${element.id}: ${error.issues.map((e) => e.message).join(", ")}`,
            );
          } else {
            errors.push(
              `Element ${element.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }
      }

      if (errors.length > 0) {
        console.warn(
          "Validation errors for some elements:",
          errors.slice(0, 10),
        );
      }

      if (bins.length === 0) {
        return NextResponse.json(
          {
            success: true,
            inserted: 0,
            skipped_existing: skippedExisting,
            skipped_proximity: skippedProximity,
            validation_errors: errors.length,
            message: "No new bins to insert.",
          },
          { status: 200 },
        );
      }

      const CHUNK_SIZE = 100;
      const chunks: z.infer<typeof RecyclingBinSchema>[][] = [];
      for (let i = 0; i < bins.length; i += CHUNK_SIZE) {
        chunks.push(bins.slice(i, i + CHUNK_SIZE));
      }

      const results: Array<{
        success: boolean;
        error?: string;
        count?: number;
      }> = [];

      for (const chunk of chunks) {
        try {
          const { error } = await supabaseServer
            .from("recycling_bins")
            .insert(chunk);

          if (error) {
            if (error.code === "23505") {
              console.warn(
                "Race-condition duplicate ignored for a chunk:",
                error.message,
              );
              results.push({ success: true, count: chunk.length });
            } else {
              results.push({ success: false, error: error.message });
            }
          } else {
            results.push({ success: true, count: chunk.length });
          }
        } catch (error) {
          results.push({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown database error",
          });
        }
      }

      const successfulInserts = results
        .filter((r) => r.success)
        .reduce((sum, r) => sum + (r.count || 0), 0);
      const failedInserts = results.filter((r) => !r.success);

      if (failedInserts.length > 0) {
        console.error("Supabase insert errors:", failedInserts);
      }

      return NextResponse.json({
        success: true,
        inserted: successfulInserts,
        failed: bins.length - successfulInserts,
        skipped_existing: skippedExisting,
        skipped_proximity: skippedProximity,
        total_processed: data.elements.length,
        validation_errors: errors.length,
        batch_results: {
          total_chunks: chunks.length,
          successful_chunks: results.filter((r) => r.success).length,
          failed_chunks: failedInserts.length,
        },
        ...(failedInserts.length > 0 && {
          warnings: failedInserts.map((f) => f.error),
        }),
      });
    } catch (err: unknown) {
      console.error("Error during Overpass API call:", err);
      if (err instanceof Error && err.message.includes("Rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }
      if (err instanceof Error && err.message.includes("Query must")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      return NextResponse.json(
        {
          error: "Error during Overpass API request",
          details: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (err: unknown) {
    console.error("Unexpected error in GET handler:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          details: err instanceof Error ? err.message : "Unknown error",
        }),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
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
