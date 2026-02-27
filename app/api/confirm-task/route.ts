import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

// CORS хедъри — позволяват заявки от мобилното приложение и други произходи
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-token",
};

// Cooldown между заявки от един и същ IP — предотвратява спам сканирания
const COOLDOWN_MS = 5000;
const ipLastCalls = new Map<string, number>();

// Административен Supabase клиент — използва service key за да заобиколи RLS политиките
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// Изчислява нивото на потребителя спрямо общия му XP
// Всяко ниво изисква 25% повече XP от предишното, започвайки от 100 XP за ниво 1
function computeLevelFromXp(totalXp: number) {
  let level = 1;
  let currentXp = totalXp;
  let xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  while (currentXp >= xpForNextLevel) {
    currentXp -= xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  }
  return { level, currentXp, xpForNextLevel };
}

// Изчислява Hamming разстоянието между два perceptual hash-а
// Използва се за засичане на визуално подобни изображения (дубликати)
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

// Отговаря на preflight CORS заявки от браузъра
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  // 1. Проверка на API токена
  // Само заявки с валиден x-api-token хедър могат да използват този endpoint
  const token = req.headers.get("x-api-token");
  if (!token || token !== process.env.NEXT_PUBLIC_SECURE_API_KEY) {
    return NextResponse.json(
      { error: "Неоторизиран достъп" },
      { status: 401, headers: corsHeaders },
    );
  }

  // 2. Rate limiting по IP адрес
  // Не позволяваме повече от едно сканиране на 5 секунди от един IP
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  if (now - (ipLastCalls.get(ip) || 0) < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Твърде много заявки — изчакай малко" },
      { status: 429, headers: corsHeaders },
    );
  }
  ipLastCalls.set(ip, now);

  try {
    // 3. Валидация на входните данни
    const { image, userDailyTaskId } = await req.json();
    if (!image || !userDailyTaskId) {
      return NextResponse.json(
        { error: "Липсват задължителни полета" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 4. Зареждане на задачата и потребителя от базата
    const { data: userTask, error: utError } = await supabase
      .from("user_daily_tasks")
      .select(`
        task_id,
        user_id,
        tasks_pool(title, description)
      `)
      .eq("id", userDailyTaskId)
      .single();

    if (utError || !userTask) throw new Error("Дневната задача не е намерена");

    const taskId = userTask.task_id;
    const userId = userTask.user_id;
    const taskDetails = userTask.tasks_pool as any;

    // 5. Проверка за точно дублирано изображение (SHA-256)
    // Изчисляваме SHA-256 хеш на файла — ако вече съществува, отхвърляме заявката
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const imgBuffer = Buffer.from(base64Data, "base64");

    const sha256Hash = crypto.createHash("sha256").update(imgBuffer).digest("hex");
    const { data: exactDuplicate } = await supabase
      .from("task_images")
      .select("id")
      .eq("sha256_hash", sha256Hash)
      .maybeSingle();

    if (exactDuplicate) {
      return NextResponse.json(
        { result: "DUPLICATE", error: "Това изображение вече е използвано." },
        { status: 409, headers: corsHeaders },
      );
    }

    // 6. Проверка за визуално подобно изображение (perceptual hash)
    // Намаляваме изображението до 8x8 пиксела в сиво и сравняваме с вече качените
    // Hamming разстояние ≤ 6 означава твърде подобни изображения
    const { data: pixels } = await sharp(imgBuffer)
      .grayscale()
      .resize(8, 8, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const avg = pixels.reduce((a, b) => a + b) / pixels.length;
    let phashBigInt = BigInt(0);
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] >= avg) phashBigInt |= BigInt(1) << BigInt(i);
    }
    const phashHex = phashBigInt.toString(16).padStart(16, "0");

    const { data: existingHashes } = await supabase
      .from("task_images")
      .select("phash")
      .eq("task_id", taskId);

    if (existingHashes) {
      for (const row of existingHashes) {
        if (getHammingDistance(phashHex, row.phash) <= 6) {
          return NextResponse.json(
            { result: "DUPLICATE", error: "Много подобно изображение вече е качено за тази задача." },
            { status: 409, headers: corsHeaders },
          );
        }
      }
    }

    // 7. Анализ на изображението с Gemini AI 
    // Изпращаме изображението към Gemini с точни инструкции за верификация на задачата
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const prompt = `
    You are a strict recycling verification agent.
    
    REQUIRED TASK: "${taskDetails.title}"
    TASK DESCRIPTION: "${taskDetails.description}"
    
    INSTRUCTIONS:
    1. Analyze the image to see if it shows the user performing the task above.
    2. If the image is unrelated, dark, blurry, or does NOT contain the material mentioned in the task, you MUST set MATERIAL to "unknown".
    3. If the material matches, identify the specific material, count the items, and estimate CO2 saved.
    
    OUTPUT FORMAT (STRICT):
    MATERIAL: [category or "unknown"]
    COUNT: [number]
    CO2: [float]
    WEIGHT_KG: [float] (x.xx) (strictly kilograms and 2 decimal places)
  `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Data } },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
        }),
      },
    );

    const gData = await geminiRes.json();
    const aiText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 8. Извличане на данни от отговора от Gemini
    const material = aiText.match(/MATERIAL:\s*(.*)/i)?.[1]?.trim() || "unknown";
    const count = parseInt(aiText.match(/COUNT:\s*(\d+)/i)?.[1] || "0");
    const co2 = parseFloat(aiText.match(/CO2:\s*([\d.]+)/i)?.[1] || "0");
    const weightKg = parseFloat(aiText.match(/WEIGHT_KG:\s*([\d.]+)/i)?.[1] || "0");

    // Задачата е изпълнена само ако материалът е разпознат и има поне 1 артикул
    const isVerified = material.toLowerCase() !== "unknown" && count > 0;

    if (isVerified) {
      // Точките за задачата се изчисляват като брой артикули × 10
      const pointsEarned = count * 10;

      // 9. Запис на изображението за бъдещо засичане на дубликати
      await supabase.from("task_images").insert({
        task_id: taskId,
        user_id: userId,
        image_url: image,
        sha256_hash: sha256Hash,
        phash: phashHex,
        file_size: imgBuffer.length,
      });

      // ── 10. Запис на събитието за рециклиране ─────────────────────────
      await supabase.from("recycling_events").insert({
        user_id: userId,
        material,
        count,
        co2_saved: co2,
        weight_kg: weightKg,
        points: pointsEarned,
      });

      // 11. Маркиране на задачата като изпълнена
      await supabase
        .from("user_daily_tasks")
        .update({ completed: true })
        .eq("id", userDailyTaskId);

      // 12. Обновяване на XP и ниво в потребителския профил
      // Взимаме текущия XP и добавяме спечелените точки от задачата
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("xp")
        .eq("id", userId)
        .single();

      if (profileError) {
        // Логваме грешката, но не спираме — задачата е вече записана успешно
        console.error("Неуспешно зареждане на профила за обновяване на XP:", profileError);
      } else {
        const newXp = (profile?.xp ?? 0) + pointsEarned;
        const { level: newLevel } = computeLevelFromXp(newXp);

        const { error: xpError } = await supabase
          .from("user_profiles")
          .update({
            xp: newXp,
            level: newLevel,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (xpError) {
          console.error("Неуспешно обновяване на XP:", xpError);
        }
      }
    }

    return NextResponse.json(
      {
        result: isVerified ? "YES" : "NO",
        material,
        count,
        co2,
      },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("Грешка при обработка на заявката:", err);
    return NextResponse.json(
      { error: "Неуспешна обработка на изображението" },
      { status: 500, headers: corsHeaders },
    );
  }
}