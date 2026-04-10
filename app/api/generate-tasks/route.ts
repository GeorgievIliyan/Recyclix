import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export const runtime = "edge";

export const GET = async (req: NextRequest) => {

  const today = new Date().toISOString().slice(0, 10);

  try {
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

    const assignmentResults = [];

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

      assignmentResults.push({
        userId: user.id,
        success: !insertError,
        error: insertError?.message,
      });
    }

    const failedAssignments = assignmentResults.filter((r) => !r.success);

    return NextResponse.json({
      ok: true,
      message: `Assigned ${tasks.length} tasks to ${users.length} users`,
      failedCount: failedAssignments.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
};

export async function POST() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export async function PATCH() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }