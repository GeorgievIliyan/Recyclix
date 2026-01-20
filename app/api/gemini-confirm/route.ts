import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

// CORS headers за разрешаване на cross-origin заявки
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Ограничение на заявки по IP (rate limiting)
const ipLastCalls = new Map<string, number>();
const COOLDOWN_MS = 5000;

// Supabase клиент с service key (RLS заобикаляне)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  // против нежелани заявки
  const token = req.headers.get('x-api-token')
  
  if (!token || token !== process.env.SECURE_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json();
    const { image, userDailyTaskId, binId } = body as {
      image?: string;
      userDailyTaskId?: string;
      binId?: string;
    };

    // Проверка на входните данни
    if (!image || !userDailyTaskId) {
      return NextResponse.json(
        { result: "NO", error: "Missing image or userDailyTaskId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Ограничение на честотата на заявки по IP
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

    // Взимаме реда от user_daily_tasks за дадения ID
    const { data: userTask, error: userTaskError } = await supabase
      .from("user_daily_tasks")
      .select("task_id")
      .eq("id", userDailyTaskId)
      .maybeSingle();

    if (userTaskError) throw userTaskError;
    if (!userTask) {
      return NextResponse.json(
        { result: "NO", error: `User daily task not found. ID: ${userDailyTaskId}` },
        { status: 404, headers: corsHeaders }
      );
    }

    const taskId = userTask.task_id;

    // Взимаме описанието на задачата от tasks_pool
    const { data: taskData, error: taskError } = await supabase
      .from("tasks_pool")
      .select("description")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!taskData?.description) {
      return NextResponse.json(
        { result: "NO", error: `Task description not found for task_id: ${taskId}` },
        { status: 404, headers: corsHeaders }
      );
    }

    const taskDescription = taskData.description;

    // Подготовка на изображението: извличане на base64 и изчисляване на хешове
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

    // Записване на хешовете в таблицата images
    const { error: dbError } = await supabase
      .from("images")
      .insert({ bin_id: binId || taskId, sha_hash: shaHash, p_hash: pHash });
    if (dbError) console.error("Failed to insert image hash:", dbError);

    // Подготовка на заявката към Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `You are verifying a waste disposal task.
    Task description: "${taskDescription}"
    Question: Does this image match the task description? Respond YES or NO.`;

    // Изпращане на заявка към Gemini
    const geminiRes = await fetch(API_URL, {
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

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API error: ${geminiRes.statusText} - ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const result = rawText.toUpperCase().includes("YES") ? "YES" : "NO";

    return NextResponse.json({ result }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("Error in POST /gemini-confirm:", err);
    return NextResponse.json({ result: "NO", error: err.message }, { status: 500, headers: corsHeaders });
  }
}
