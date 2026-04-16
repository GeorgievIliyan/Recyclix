import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { supabase } from "@/lib/supabase-browser";

/**
 * OBJECTIVE WASTE CLASSIFIER
 * Logic: Uses Gemini 2.0 Flash with a pre-defined material reference table 
 * to estimate weight and CO2 based on object volume and material type.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Simple In-memory rate limiting
const ipLastCalls = new Map<string, number>();
const COOLDOWN_MS = 5000;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { binId, image, target } = body;

    // 1. Validation
    if (!binId || !image) {
      return NextResponse.json(
        { result: "NO", error: "Missing binId or image" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    if (now - (ipLastCalls.get(ip) || 0) < COOLDOWN_MS) {
      return NextResponse.json(
        { result: "NO", error: "Slow down! Wait a few seconds." },
        { status: 429, headers: corsHeaders }
      );
    }
    ipLastCalls.set(ip, now);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    // 3. Image Processing (Hashing for uniqueness & deduplication)
    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    const imgBuffer = Buffer.from(base64Image, "base64");

    const shaHash = crypto.createHash("sha256").update(imgBuffer).digest("hex");

    // Generate a pHash (Perceptual Hash) using sharp for visual similarity checking
    const { data: pixels } = await sharp(imgBuffer)
      .resize(8, 8)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const avg = pixels.reduce((sum, px) => sum + px, 0) / pixels.length;
    const pHash = Array.from(pixels).map((px) => (px >= avg ? "1" : "0")).join("");

    // Log the attempt to Supabase
    const { error: dbError } = await supabase
      .from("images")
      .insert({ bin_id: binId, sha_hash: shaHash, p_hash: pHash });
    if (dbError) console.error("Database log error:", dbError.message);

    // 4. Construct the Objective Prompt
    // We provide the AI with a "Unit Scale" so it can calculate mass properly.
    const systemInstruction = `
      Act as a high-precision waste audit system. Analyze the object size relative to the environment.
      
      REFERENCE UNIT WEIGHTS (Approximate):
      - Plastic: Small bottle (0.5L) = 0.02kg, Large Jug = 0.12kg, Plastic Bag = 0.005kg.
      - Metal: Aluminum Can = 0.015kg, Steel Food Tin = 0.05kg.
      - Glass: Beer Bottle = 0.25kg, Large Jar = 0.4kg.
      - Paper: A4 Sheet = 0.005kg, Cardboard Box (Medium) = 0.3kg.
      
      CO2 SAVINGS FACTORS (kg of CO2 saved per 1kg of material recycled):
      - Aluminum: 9.0 | Plastic: 1.5 | Glass: 0.3 | Paper: 1.0 | Steel: 1.5
      
      CALCULATION LOGIC:
      1. Identify Material.
      2. Estimate Volume/Size (Small/Medium/Large).
      3. Total Weight = Count * (Unit Weight based on size).
      4. Total CO2 = Total Weight * CO2 Factor.
    `;

    const prompt = target
      ? `Target Material: ${target}.
         Does the object match the target? 
         Respond exactly:
         RESULT: [YES/NO]
         COUNT: [number]
         WEIGHT_KG: [float]
         CO2_SAVED_KG: [float]`
      : `Classify the waste in the image. 
         Categories: plastic, paper, glass, metal, textile, organic, wood.
         Respond exactly:
         MATERIAL: [category]
         MATERIAL_BG: [category in Bulgarian]
         COUNT: [number]
         WEIGHT_KG: [float]
         CO2_SAVED_KG: [float]`;

    // 5. Call Gemini 2.0 Flash
    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemInstruction + "\n" + prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Image.replace(/\s/g, "") } }
          ]
        }]
      })
    });

    if (!geminiResponse.ok) throw new Error("Gemini API failed");

    const data = await geminiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // 6. Objective Parsing using Regex
    const parse = (regex: RegExp, fallback: string) => (rawText.match(regex)?.[1] || fallback).trim();

    const count = parseInt(parse(/COUNT:\s*([\d.]+)/i, "1"), 10);
    const weightKg = parseFloat(parse(/WEIGHT_KG:\s*([\d.]+)/i, "0"));
    const co2 = parseFloat(parse(/CO2_SAVED_KG:\s*([\d.]+)/i, "0"));

    if (target) {
      const result = rawText.toUpperCase().includes("RESULT: YES") ? "YES" : "NO";
      return NextResponse.json({
        result,
        count,
        weight_kg: weightKg,
        co2,
        points: result === "YES" ? count * 10 : 0
      }, { headers: corsHeaders });
    } else {
      const material = parse(/MATERIAL:\s*(\w+)/i, "unknown").toLowerCase();
      const materialBg = parse(/MATERIAL_BG:\s*(.+)/i, "неизвестно");
      
      return NextResponse.json({
        material,
        materialBg,
        count,
        weight_kg: weightKg,
        co2,
        points: material !== "unknown" ? count * 10 : 0
      }, { headers: corsHeaders });
    }

  } catch (err: any) {
    console.error("Critical Error:", err);
    return NextResponse.json({
      result: "NO",
      error: err.message,
      weight_kg: 0,
      co2: 0,
      count: 0
    }, { status: 500, headers: corsHeaders });
  }
}