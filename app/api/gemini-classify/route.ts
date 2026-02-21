import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { supabase } from "@/lib/supabase-browser";

// CORS headers за frontend достъп
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Прост rate-limiting по IP
const ipLastCalls = new Map<string, number>();
const COOLDOWN_MS = 5000;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const binId = body.binId;
    const image = body.image;
    const target = body.target;

    // Проверка на задължителни полета
    if (!binId)
      return NextResponse.json(
        { result: "NO", error: "Missing binId" },
        { status: 400, headers: corsHeaders },
      );
    if (!image)
      return NextResponse.json(
        { result: "NO", error: "No image provided" },
        { status: 400, headers: corsHeaders },
      );

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const last = ipLastCalls.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json(
        { result: "NO", error: "Cooldown active" },
        { status: 429, headers: corsHeaders },
      );
    }
    ipLastCalls.set(ip, now);

    // Проверка на API ключ
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API key");

    // Извличане на base64 от dataURL
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    // SHA256 хеш за уникална идентификация
    const shaHash = crypto
      .createHash("sha256")
      .update(base64Image, "base64")
      .digest("hex");

    // pHash за сравняване на изображения (resize + grayscale)
    const imgBuffer = Buffer.from(base64Image, "base64");
    const { data: pixels } = await sharp(imgBuffer)
      .resize(8, 8)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const avg = pixels.reduce((sum, px) => sum + px, 0) / pixels.length;
    const pHash = Array.from(pixels)
      .map((px) => (px >= avg ? "1" : "0"))
      .join("");

    // Запис в Supabase таблица images
    const { error: dbError } = await supabase
      .from("images")
      .insert({ bin_id: binId, sha_hash: shaHash, p_hash: pHash });
    if (dbError) console.error("Supabase error:", dbError);

    // Подготовка на prompt за Gemini API с добавено поле за превод само на материала
    const prompt = target
      ? `You are verifying waste material. 
          Target: ${target}
          Question: Does the object belong to the target material? 
          Also, count how many distinct items of this material are visible.
          Give a rough estimate of save CO2.
          Estimate the total weight in kilograms.
          Respond exactly in this format:
          RESULT: [YES/NO]
          COUNT: [number]
          CO2: [float]
          WEIGHT_KG: [float] (x.xxx)
          `
      : `Classify the recycling objects in the image. 
          Categories: plastic, paper, glass, metal, textile, organic, wood.
          Give a rough estimate of save CO2.
          Estimate the total weight in kilograms.
          Respond exactly in this format:
          MATERIAL: [category]
          MATERIAL_BG: [category in bulgarian]
          COUNT: [number]
          CO2: [float]
          WEIGHT_KG: [float] (x.xxx)
          If unsure, MATERIAL: unknown | MATERIAL_BG: неизвестно`;

    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image.replace(/\s/g, ""),
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini error:", text);
      throw new Error("Gemini server error");
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (process.env.NODE_ENV === "development") {
      console.log("Raw response:", rawText);
    }

    // Парсване на общи полета
    const countMatch = rawText.match(/COUNT:\s*(\d+)/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : 1;

    const co2Match = rawText.match(/CO2:\s*([\d.]+)/i);
    const co2 = co2Match ? parseFloat(co2Match[1]) : 0;
    const weightKg = parseFloat(
      rawText.match(/WEIGHT_KG:\s*([\d.]+)/i)?.[1] || "0",
    );

    if (target) {
      const result = rawText.toUpperCase().includes("RESULT: YES")
        ? "YES"
        : "NO";
      const points = result === "YES" ? count * 10 : 0;

      return NextResponse.json(
        { result, count, points, co2, weight_kg: weightKg },
        { headers: corsHeaders },
      );
    } else {
      const matMatch = rawText.match(/MATERIAL:\s*(\w+)/i);
      const matBgMatch = rawText.match(/MATERIAL_BG:\s*(.+)/i);

      const material = matMatch ? matMatch[1].toLowerCase().trim() : "unknown";
      const materialBg = matBgMatch ? matBgMatch[1].trim() : "неизвестно";

      const points = material !== "unknown" ? count * 10 : 0;

      return NextResponse.json(
        { material, materialBg, count, points, co2, weight_kg: weightKg },
        { headers: corsHeaders },
      );
    }
  } catch (err: any) {
    console.error("POST error:", err);
    return NextResponse.json(
      {
        result: "NO",
        error: err.message,
        material: "unknown",
        materialBg: "неизвестно",
        count: 0,
        points: 0,
        weight_kg: 0,
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function GET(req: NextRequest) {
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
