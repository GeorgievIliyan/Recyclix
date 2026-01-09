import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Инициализация на Supabase клиент с service key (бypass RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const runtime = "edge";

export const GET = async () => {
  const today = new Date().toISOString().slice(0, 10); // Взимаме днешната дата във формат YYYY-MM-DD

  // Взимаме всички потребители
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("id");

  if (usersError || !users?.length) {
    return NextResponse.json({
      ok: false,
      message: "No users found", // Няма намерени потребители
    });
  }

  // Взимаме 3 задачи от tasks_pool
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks_pool")
    .select("id")
    .limit(3);

  if (tasksError || !tasks?.length) {
    return NextResponse.json({
      ok: false,
      message: "No tasks found", // Няма намерени задачи
    });
  }

  // Присвояване на задачи на всеки потребител
  // Използваме upsert, за да избегнем дублиране
  for (const user of users) {
    const rows = tasks.map(task => ({
      user_id: user.id,
      task_id: task.id,
      date: today, // Присвояване към днешната дата
    }));

    const { error: insertError } = await supabase
      .from("user_daily_tasks")
      .upsert(rows, {
        onConflict: "user_id,task_id,date", // Проверка за конфликти по потребител, задача и дата
        ignoreDuplicates: true, // Игнорира дублирани записи
      });

    if (insertError) {
      return NextResponse.json({
        ok: false,
        message: "Failed assigning tasks", // Грешка при присвояване
        error: insertError.message,
      });
    }
  }

  // Успешно присвояване на задачи
  return NextResponse.json({
    ok: true,
    message: `Assigned ${tasks.length} tasks to ${users.length} users`,
  });
};