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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-api-token');
  
  if (!token || token !== process.env.SECURE_API_KEY) {
    console.log("Unauthorized request: Missing or invalid API token");
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { image, userDailyTaskId } = body as {
      image?: string;
      userDailyTaskId?: string;
    };

    if (!image || !userDailyTaskId) {
      return NextResponse.json(
        { result: "NO", error: "Missing image or userDailyTaskId" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Processing task confirmation for userDailyTaskId: ${userDailyTaskId}`);
    console.log(`Image size: ${Math.round(image.length / 1024)} KB`);

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const last = ipLastCalls.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json(
        { result: "NO", error: "Please wait a few seconds before trying again" },
        { status: 429, headers: corsHeaders }
      );
    }
    ipLastCalls.set(ip, now);

    const { data: userTask, error: userTaskError } = await supabase
      .from("user_daily_tasks")
      .select("task_id")
      .eq("id", userDailyTaskId)
      .maybeSingle();

    if (userTaskError) throw userTaskError;
    if (!userTask) {
      console.error(`User daily task not found: ${userDailyTaskId}`);
      return NextResponse.json(
        { result: "NO", error: `Task not found` },
        { status: 404, headers: corsHeaders }
      );
    }

    const taskId = userTask.task_id;

    const { data: taskData, error: taskError } = await supabase
      .from("tasks_pool")
      .select("title, description")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!taskData?.description) {
      console.error(`Task description not found for task_id: ${taskId}`);
      return NextResponse.json(
        { result: "NO", error: `Task description not found` },
        { status: 404, headers: corsHeaders }
      );
    }

    const taskTitle = taskData.title || "Task";
    const taskDescription = taskData.description;
    
    console.log(`Task: ${taskTitle}`);
    console.log(`Description: ${taskDescription}`);

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    
    const shaHash = crypto.createHash("sha256").update(base64Image, "base64").digest("hex");
    console.log(`Image SHA256 hash: ${shaHash.substring(0, 16)}...`);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

    const MODEL = "gemini-2.0-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Task: ${taskTitle}
                    Description: ${taskDescription}

                    Look at the image.
                    Does the image clearly show the correct material mentioned in the task
                    (e.g. aluminum can, plastic bottle, paper), even if the task itself is
                    not fully completed yet?

                    Respond with only YES or NO.`;

    console.log("Calling Gemini API...");
    
    const geminiRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { 
                mimeType: "image/jpeg", 
                data: base64Image.replace(/\s/g, "") 
              } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1,
        }
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.statusText, errorText);
      throw new Error(`Gemini API error: ${geminiRes.statusText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    console.log("Gemini response text:", rawText);
    
    const upperText = rawText.toUpperCase();
    const result = (upperText.includes("YES") && !upperText.includes("NO")) ? "YES" : "NO";
    
    console.log(`Final result: ${result}`);

    if (result === "YES") {
      console.log(`Marking task ${userDailyTaskId} as completed...`);
      
      const { error: updateError } = await supabase
        .from("user_daily_tasks")
        .update({ completed: true })
        .eq("id", userDailyTaskId);

      if (updateError) {
        console.error("Failed to update task:", updateError);
      } else {
        console.log("Task marked as completed successfully");
      }
    }

    return NextResponse.json({ 
      result,
      taskTitle,
      taskDescription 
    }, { headers: corsHeaders });
    
  } catch (err: any) {
    console.error("Error in task confirmation:", err);
    return NextResponse.json({ 
      result: "NO", 
      error: "Failed to process image" 
    }, { status: 500, headers: corsHeaders });
  }
}