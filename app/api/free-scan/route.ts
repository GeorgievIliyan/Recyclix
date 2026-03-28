import { NextResponse } from "next/server";
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

    if (!image)
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400, headers: corsHeaders },
      );
    if (!task)
      return NextResponse.json(
        { error: "No task description provided" },
        { status: 400, headers: corsHeaders },
      );

    // лимитиране на заявки
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const last = ipLastCalls.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Cooldown active" },
        { status: 429, headers: corsHeaders },
      );
    }
    ipLastCalls.set(ip, now);

    // API ключ
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API key");

    // снимка в BASE64
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    // криптиране на снимката
    const shaHash = crypto
      .createHash("sha256")
      .update(base64Image, "base64")
      .digest("hex");
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

    // prompt към изкуствения интелект
    const prompt = `You are a recycling analysis assistant with knowledge of environmental impact data.

    Analyze this image and identify recyclable items.
    Task: ${task}

    Use these CO2 savings per item as reference (in kg):
    - plastic bottle: 0.5 kg | plastic bag: 0.1 kg | general plastic: 0.3 kg
    - glass bottle: 0.3 kg | glass jar: 0.25 kg | general glass: 0.2 kg  
    - cardboard box: 1.2 kg | newspaper: 0.4 kg | general paper: 0.5 kg
    - aluminium can: 1.0 kg | steel can: 0.6 kg | general metal: 0.8 kg
    - e-waste item: 5.0 kg
    - organic waste (per item): 0.2 kg
    - textile item: 2.0 kg

    Calculate total CO2 = (CO2 per item) × (count of items).

    Return EXACTLY in this format with no extra text:
    MATERIAL: [plastic, glass, paper, metal, e-waste, organic, textile, or unknown]
    COUNT: [integer number of items visible]
    CO2: [total CO2 savings as decimal, e.g. 1.50]`;

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

    if (process.env.NODE_ENV === "development")
      console.log("Raw response:", rawText);

    const materialMatch = rawText.match(/MATERIAL:\s*(\w+)/i);
    const countMatch = rawText.match(/COUNT:\s*(\d+)/i);
    const co2Match = rawText.match(/CO2:\s*([\d.]+)/i);

    const allowedMaterials = [
      "plastic",
      "paper",
      "glass",
      "metal",
      "textile",
      "organic",
      "wood",
    ];

    const materialRaw = materialMatch
      ? materialMatch[1].toLowerCase()
      : "unknown";
    const material =
      allowedMaterials.find((m) => materialRaw.includes(m)) || "unknown";
    const count = countMatch ? parseInt(countMatch[1], 10) : 1;
    const co2 = co2Match ? parseFloat(co2Match[1]) : count * 0.3;
    const POINTS_MAP: Record<string, number> = {
      "e-waste": 40,
      metal: 25,
      textile: 20,
      plastic: 12,
      glass: 8,
      paper: 6,
      organic: 3,
      unknown: 0,
    };

    const points = POINTS_MAP[material] !== undefined
      ? POINTS_MAP[material] * count
      : 0;

    return NextResponse.json(
      { material, count, points, co2 },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("POST error:", err);
    return NextResponse.json(
      { error: err.message, material: "unknown", count: 0, points: 0, co2: 0 },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
