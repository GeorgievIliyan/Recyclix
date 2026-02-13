import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Supabase клиент
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export const runtime = "edge";

// Валидация на токен
const ApiTokenSchema = z.object({
  token: z.string().min(1, "API token is required"),
});

export const GET = async (req: NextRequest) => {
  // Валидация на токен-а в хедъра
  const tokenHeader = req.headers.get("x-api-token");
  const parsed = ApiTokenSchema.safeParse({ token: tokenHeader });

  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) {
    if (!parsed.success || parsed.data.token !== process.env.SECURE_API_KEY) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          ...(parsed.success
            ? undefined
            : {
                details: parsed.error.issues.map((i) => ({
                  field: i.path.join("."),
                  message: i.message,
                })),
              }),
        },
        { status: 401 },
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Взимане на всички потребители
    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id");

    if (usersError || !users?.length) {
      return NextResponse.json({
        ok: false,
        message: "No users found",
        ...(usersError && { error: usersError.message }),
      });
    }

    // Взимане на задачи
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks_pool")
      .select("id")
      .limit(5);

    if (tasksError || !tasks?.length) {
      return NextResponse.json({
        ok: false,
        message: "No tasks found",
        ...(tasksError && { error: tasksError.message }),
      });
    }

    // Назначаване на задачи
    const assignmentResults: Array<{
      userId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const user of users) {
      const rows = tasks.map((task) => ({
        user_id: user.id,
        task_id: task.id,
        date: today,
      }));

      const { error: insertError } = await supabase
        .from("user_daily_tasks")
        .upsert(rows, {
          onConflict: "user_id,task_id,date",
          ignoreDuplicates: true,
        });

      if (insertError) {
        assignmentResults.push({
          userId: user.id,
          success: false,
          error: insertError.message,
        });
      } else {
        assignmentResults.push({ userId: user.id, success: true });
      }
    }

    const failedAssignments = assignmentResults.filter((r) => !r.success);
    if (failedAssignments.length > 0) {
      console.warn("Failed task assignments:", failedAssignments);
    }

    return NextResponse.json({
      ok: true,
      message: `Assigned ${tasks.length} tasks to ${users.length} users`,
      failedAssignments:
        failedAssignments.length > 0 ? failedAssignments : undefined,
    });
  } catch (err: any) {
    console.error("Error assigning daily tasks:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error",
        error: err.message || "Unknown error",
      },
      { status: 500 },
    );
  }
};

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
