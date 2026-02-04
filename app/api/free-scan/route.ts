import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const COOLDOWN_MS = 5000;
const ipLastCalls = new Map<string, number>();

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, task } = body;

    if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400, headers: corsHeaders });
    if (!task) return NextResponse.json({ error: "No task description provided" }, { status: 400, headers: corsHeaders });

    // Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const last = ipLastCalls.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json({ error: "Cooldown active" }, { status: 429, headers: corsHeaders });
    }
    ipLastCalls.set(ip, now);

    // API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API key");

    // Base64
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    // SHA + pHash (optional, can keep for uniqueness)
    const shaHash = crypto.createHash("sha256").update(base64Image, "base64").digest("hex");
    const imgBuffer = Buffer.from(base64Image, "base64");
    const { data: pixels } = await sharp(imgBuffer).resize(8, 8).grayscale().raw().toBuffer({ resolveWithObject: true });
    const avg = pixels.reduce((sum, px) => sum + px, 0) / pixels.length;
    const pHash = Array.from(pixels).map(px => (px >= avg ? "1" : "0")).join("");

    // Prepare Gemini prompt
    const prompt = `
    You are an AI assistant classifying waste. 
    Task: ${task}
    Analyze the image and respond exactly in this format:
    MATERIAL: [category]
    COUNT: [number]
    CO2: [float]
    If unsure, MATERIAL: unknown
    `;

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

    if (process.env.NODE_ENV === "development") console.log("Raw response:", rawText);

    const countMatch = rawText.match(/COUNT:\s*(\d+)/i);
    const co2Match = rawText.match(/CO2:\s*([\d.]+)/i);
    const matMatch = rawText.match(/MATERIAL:\s*(\w+)/i);

    const allowedMaterials = ["plastic", "paper", "glass", "metal", "textile", "organic", "wood"];

    const count = countMatch ? parseInt(countMatch[1], 10) : 1;
    const co2 = co2Match ? parseFloat(co2Match[1]) : 0;
    const normalized = matMatch ? matMatch[1].toLowerCase() : "unknown";
    const material = allowedMaterials.find(m => normalized.includes(m)) || "unknown";
    const points = material !== "unknown" ? count * 10 : 0;

    return NextResponse.json({ material, count, points, co2 }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("POST error:", err);
    return NextResponse.json({ error: err.message, material: "unknown", count: 0, points: 0, co2: 0 }, { status: 500, headers: corsHeaders });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}