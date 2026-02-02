import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ipLastCalls = new Map<string, number>();
const COOLDOWN_MS = 5000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const materialLabels: Record<string, string> = {
  plastic: "пластмаса",
  glass: "стъкло", 
  paper: "хартия",
  metal: "метал",
  textile: "текстил",
  "general waste": "битов отпадък",
  batteries: "батерии",
  ewaste: "електроника"
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, binId, target } = body as {
      image?: string;
      binId?: string;
      target?: string;
    };

    if (!image) {
      return NextResponse.json(
        { result: "NO", error: "Missing image" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!target) {
      return NextResponse.json(
        { result: "NO", error: "Missing target material" },
        { status: 400, headers: corsHeaders }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const last = ipLastCalls.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json(
        { result: "NO", error: "Cooldown active" },
        { status: 429, headers: corsHeaders }
      );
    }
    ipLastCalls.set(ip, now);

    let actualBinUuid: string | null = null;
    if (binId) {
      const { data: binData } = await supabase
        .from("recycling_bins")
        .select("id")
        .eq("code", binId) 
        .maybeSingle();

      if (binData) {
        actualBinUuid = binData.id;
      }
    }

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    const shaHash = crypto.createHash("sha256").update(base64Image, "base64").digest("hex");

    const imgBuffer = Buffer.from(base64Image, "base64");
    const { data: pixelData } = await sharp(imgBuffer)
      .resize(8, 8)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(pixelData);
    const avg = Array.from(pixels).reduce((sum, px) => sum + px, 0) / pixels.length;
    const pHash = Array.from(pixels).map((px) => (px >= avg ? "1" : "0")).join("");

    if (actualBinUuid) {
      await supabase
        .from("images")
        .insert({ bin_id: actualBinUuid, sha_hash: shaHash, p_hash: pHash });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("Missing Gemini API key");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const targetBulgarian = materialLabels[target] || target;

    const prompt = `You are verifying waste material classification and counting objects.
    
    Target material: ${target} (${targetBulgarian})
    
    Task:
    1. Does the object(s) in this image belong to the "${target}" (${targetBulgarian}) material category for recycling?
    2. Count how many separate items of this specific material are in the image.
    3. Give a real rough estimate based on the material type and image
    
    Respond in exactly this format:
    RESULT: [YES or NO]
    COUNT: [number]
    CO2: [float]
    `;

    const geminiRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Image.replace(/\s/g, "") } },
          ],
        }],
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API error:", errorText);
      throw new Error("Gemini API communication failed");
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    
    const result = rawText.toUpperCase().includes("RESULT: YES") ? "YES" : "NO";
    const countMatch = rawText.match(/COUNT:\s*(\d+)/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : 1;
    const co2Match = rawText.match(/CO2:\s*([\d.]+)/i);
    const co2 = co2Match ? parseFloat(co2Match[1]) : 0;

    const points = result === "YES" ? count * 10 : 0;

    if (process.env.NODE_ENV === "development") {
      console.log("Gemini raw text response:", rawText);
      console.log(`Parsed: ${result}, Count: ${count}, Points: ${points}`);
    }

    return NextResponse.json({ 
      result, 
      count, 
      points,
      co2 
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error("Error in gemini-verify-material:", err);
    return NextResponse.json(
      { result: "NO", error: err.message, points: 0 }, 
      { status: 500, headers: corsHeaders }
    );
  }
}