import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userDailyTaskId, image } = body;
    
    if (!image || !userDailyTaskId) {
      return NextResponse.json(
        { success: false, error: "Missing image or userDailyTaskId" },
        { status: 400 }
      );
    }
    
    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "Invalid image format" },
        { status: 400 }
      );
    }
    
    console.log("Confirm API: Processing task confirmation for:", userDailyTaskId);
    console.log("Image size:", Math.round(image.length / 1024), "KB");
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const geminiResponse = await fetch(`${baseUrl}/api/confirm-task`, {
      method: "POST",
      headers: { 
        "x-api-token": process.env.SECURE_API_KEY || "",
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        userDailyTaskId, 
        image 
      }),
    });
    
    const data = await geminiResponse.json();
    console.log("Task confirmation response:", data);
    
    return NextResponse.json({
      success: data.result === "YES",
      result: data.result,
      taskTitle: data.taskTitle,
      taskDescription: data.taskDescription,
      error: data.error
    }, { 
      status: geminiResponse.status 
    });
    
  } catch (err: any) {
    console.error("Error in confirm API route:", err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || "Failed to process request" 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    {error: "Method not allowed"},
    {status: 405}
  )
}