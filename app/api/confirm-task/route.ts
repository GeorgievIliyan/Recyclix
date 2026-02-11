import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-token",
};

const COOLDOWN_MS = 5000;
const ipLastCalls = new Map<string, number>();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function getHammingDistance(hex1: string, hex2: string): number {
  let n = BigInt(`0x${hex1}`) ^ BigInt(`0x${hex2}`);
  let distance = 0;
  const ZERO = BigInt(0);
  const ONE = BigInt(1);

  while (n > ZERO) {
    n &= n - ONE; 
    distance++;
  }
  return distance;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-api-token');
  if (!token || token !== process.env.SECURE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, userDailyTaskId } = body as { image?: string; userDailyTaskId?: string };
    
    if (!image || !userDailyTaskId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400, headers: corsHeaders });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    if (now - (ipLastCalls.get(ip) || 0) < COOLDOWN_MS) {
      return NextResponse.json({ error: "Slow down! Wait a few seconds." }, { status: 429, headers: corsHeaders });
    }
    ipLastCalls.set(ip, now);

    const { data: userTask, error: utError } = await supabase
      .from("user_daily_tasks")
      .select("task_id, user_id, tasks_pool(title, description)")
      .eq("id", userDailyTaskId)
      .single();

    if (utError || !userTask) throw new Error("Task record not found");
    const taskData = userTask.tasks_pool as any;
    const taskId = userTask.task_id;
    const userId = userTask.user_id;

    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const imgBuffer = Buffer.from(base64Data, "base64");

    const sha256Hash = crypto.createHash("sha256").update(imgBuffer).digest("hex");
    const { data: exactMatch } = await supabase
      .from("task_images")
      .select("id")
      .eq("sha256_hash", sha256Hash)
      .maybeSingle();

    if (exactMatch) {
      return NextResponse.json({ result: "DUPLICATE", error: "Exact photo already uploaded." }, { status: 409, headers: corsHeaders });
    }

    const { data: pixels } = await sharp(imgBuffer)
      .grayscale()
      .resize(8, 8, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const avg = pixels.reduce((a, b) => a + b) / pixels.length;
    let phashBigInt = BigInt(0);
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] >= avg) {
        phashBigInt |= (BigInt(1) << BigInt(i));
      }
    }
    const phashHex = phashBigInt.toString(16).padStart(16, '0');

    const { data: existingHashes } = await supabase
      .from("task_images")
      .select("phash")
      .eq("task_id", taskId);

    if (existingHashes) {
      for (const row of existingHashes) {
        if (getHammingDistance(phashHex, row.phash) <= 6) {
          return NextResponse.json({ result: "DUPLICATE", error: "Similar photo detected." }, { status: 409, headers: corsHeaders });
        }
      }
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Task: ${taskData.title}. Description: ${taskData.description}. Does this image show the task being completed? YES or NO only.` },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2 }
      }),
    });

    const gJson = await geminiRes.json();
    const aiResponse = gJson.candidates?.[0]?.content?.parts?.[0]?.text?.toUpperCase() || "";
    const isVerified = aiResponse.includes("YES");

    if (isVerified) {
      await supabase.from("task_images").insert({
        task_id: taskId,
        user_id: userId,
        image_url: image, 
        sha256_hash: sha256Hash,
        phash: phashHex,
        file_size: imgBuffer.length
      });

      await supabase.from("user_daily_tasks").update({ completed: true }).eq("id", userDailyTaskId);
    }

    return NextResponse.json({ 
      result: isVerified ? "YES" : "NO",
      message: isVerified ? "Task verified!" : "AI could not verify this image."
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}