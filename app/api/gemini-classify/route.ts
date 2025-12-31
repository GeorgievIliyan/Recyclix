import { NextResponse } from "next/server";
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
    if (!binId) return NextResponse.json({ result: "NO", error: "Missing binId" }, { status: 400, headers: corsHeaders });
    if (!image) return NextResponse.json({ result: "NO", error: "No image provided" }, { status: 400, headers: corsHeaders });

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const last = ipLastCalls.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json({ result: "NO", error: "Cooldown active" }, { status: 429, headers: corsHeaders });
    }
    ipLastCalls.set(ip, now);

    // Проверка на API ключ
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API key");

    // Извличане на base64 от dataURL
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    // SHA256 хеш за уникална идентификация
    const shaHash = crypto.createHash("sha256").update(base64Image, "base64").digest("hex");

    // pHash за сравняване на изображения (resize + grayscale)
    const imgBuffer = Buffer.from(base64Image, "base64");
    const { data: pixels } = await sharp(imgBuffer).resize(8, 8).grayscale().raw().toBuffer({ resolveWithObject: true });
    const avg = pixels.reduce((sum, px) => sum + px, 0) / pixels.length;
    const pHash = Array.from(pixels).map(px => (px >= avg ? "1" : "0")).join("");

    // Запис в Supabase таблица images
    const { error: dbError } = await supabase.from("images").insert({ bin_id: binId, sha_hash: shaHash, p_hash: pHash });
    if (dbError) console.error("Supabase error:", dbError);

    // Подготовка на prompt за Gemini API
    const prompt = target
      ? `You are verifying waste material.\nTarget: ${target}\nQuestion: Does the object belong to the target material?\nRespond YES or NO.`
      : `Classify the object into ONE of: plastic, paper, glass, metal, textile, organic, wood.\nRespond with ONE WORD only. If unsure, respond unknown.`;

    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    // Изпращане на изображението и prompt към Gemini
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Image.replace(/\s/g, "") } },
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

    const allowedMaterials = ["plastic", "paper", "glass", "metal", "textile", "organic", "wood"];

    // Ако е проверка за конкретен материал
    if (target) {
      const result = rawText.toUpperCase().includes("YES") ? "YES" : "NO";
      return NextResponse.json({ result }, { headers: corsHeaders });
    } else {
      // Ако е класификация
      const normalized = rawText.toLowerCase().trim();
      const found = allowedMaterials.find(m => normalized.includes(m));
      const material = found || "unknown";
      return NextResponse.json({ material }, { headers: corsHeaders });
    }
  } catch (err: any) {
    console.error("POST error:", err);
    return NextResponse.json({ result: "NO", error: err.message, material: "unknown" }, { status: 500, headers: corsHeaders });
  }
}