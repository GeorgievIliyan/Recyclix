import { NextResponse } from "next/server"

// CORS хедъри – позволяват заявки от всички източници
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// Запис на последното извикване по IP (rate limit)
const ipLastCalls = new Map<string, number>()
const COOLDOWN_MS = 5000 // 5 секунди cooldown

// OPTIONS заявка за CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: Request) {
  try {
    // Данни от клиента
    const { image, target } = await req.json()

    // Проверка за липсваща снимка
    if (!image) {
      return NextResponse.json(
        { result: "NO", error: "No image provided" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Вземане на IP адрес (за rate limiting)
    const ip = req.headers.get("x-forwarded-for") || "unknown"
    const now = Date.now()
    const last = ipLastCalls.get(ip) || 0

    // Cooldown проверка
    if (now - last < COOLDOWN_MS) {
      return NextResponse.json(
        { result: "NO", error: "Cooldown active" },
        { status: 429, headers: corsHeaders }
      )
    }

    ipLastCalls.set(ip, now)

    // Gemini API настройки
    const apiKey = process.env.GEMINI_API_KEY!
    const base64Image = image.includes(",")
      ? image.split(",")[1]
      : image

    const MODEL = "gemini-2.0-flash"
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

    // Prompt според режима: проверка или класификация
    const prompt = target
      ? `
      You are verifying waste material.

      Target material: ${target}

      Question:
      Does the object in the image belong to the target material?

      Rules:
      - Respond ONLY with YES or NO
      - If unsure, respond NO
      `
      : `
      Classify the object into ONE of:
      plastic, paper, glass, metal, textile, organic, wood.

      Rules:
      - Respond with ONE WORD only
      - If unsure, respond unknown
      `

    // Заявка към Gemini
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
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    })

    // Ако Gemini е с rate limit
    if (response.status === 429) {
      ipLastCalls.set(ip, now + 30000) // удължен cooldown
      return NextResponse.json(
        { result: "NO", error: "Gemini rate limit" },
        { status: 429, headers: corsHeaders }
      )
    }

    const data = await response.json()

    // Извличане на суровия текстов отговор
    const raw =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    // Режим: проверка (YES / NO)
    if (target) {
      const result = raw.toUpperCase().includes("YES") ? "YES" : "NO"
      return NextResponse.json({ result }, { headers: corsHeaders })
    }

    // Режим: класификация на материал
    const material = raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z]/g, "")

    return NextResponse.json(
      { material: material || "unknown" },
      { headers: corsHeaders }
    )
  } catch (err: any) {
    // Обща server грешка
    return NextResponse.json(
      { result: "NO", error: err.message },
      { status: 500, headers: corsHeaders }
    )
  }
}