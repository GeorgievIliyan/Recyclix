import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-browser";

export const runtime = "edge";

export const GET = async () => {
  try {
    const debug: string[] = [];

    // Днешна дата във формат YYYY-MM-DD (без час)
    const today = new Date().toISOString().slice(0, 10);
    const TASKS_PER_DAY = 3;

    // 1️⃣ Взимаме всички потребителски профили
    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id");

    if (usersError) {
      debug.push(`Грешка при взимане на потребители: ${usersError.message}`);
      return NextResponse.json({ ok: false, debug });
    }

    if (!users || users.length === 0) {
      debug.push("Няма намерени потребители");
      return NextResponse.json({ ok: false, debug });
    }

    debug.push(`Намерени ${users.length} потребители`);

    // 2️⃣ За всеки потребител генерираме дневни задачи
    for (const user of users) {
      debug.push(`Обработваме потребител: ${user.id}`);

      // Взимаме задачите, които вече са дадени днес на този потребител
      const { data: assigned, error: assignedError } = await supabase
        .from("user_daily_tasks")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("date", today);

      if (assignedError) {
        debug.push(`Грешка при взимане на вече присвоени задачи за ${user.id}: ${assignedError.message}`);
        continue;
      }

      const assignedIds = assigned?.map(t => t.task_id) || [];
      debug.push(`Вече присвоени задачи за ${user.id}: ${assignedIds}`);

      // 3️⃣ Взимаме активни задачи, които още не са присвоени
      let query = supabase
        .from("tasks_pool")
        .select("id, title") // добавяме title за по-лесен дебъг
        .eq("is_active", true)
        .limit(TASKS_PER_DAY);

      // Ако има присвоени задачи, филтрираме ги
      if (assignedIds.length > 0) {
        const uuids = assignedIds.map(id => `'${id}'`).join(",");
        query = query.not("id", "in", `(${uuids})`);
      }

      const { data: tasks, error: tasksError } = await query;

      if (tasksError) {
        debug.push(`Грешка при взимане на задачи за ${user.id}: ${tasksError.message}`);
        continue;
      }

      if (!tasks || tasks.length === 0) {
        debug.push(`Няма налични задачи за ${user.id}`);
        continue;
      }

      debug.push(`Намерени задачи за присвояване на ${user.id}: ${tasks.map(t => t.title)}`);

      // 4️⃣ Подготвяме редовете за запис
      const rows = tasks.map(task => ({
        user_id: user.id,
        task_id: task.id,
        date: today
      }));

      debug.push(`Вмъкваме редове за ${user.id}: ${rows.map(r => r.task_id)}`);

      // 5️⃣ Вмъкваме дневните задачи в базата
      const { error: insertError } = await supabase.from("user_daily_tasks").insert(rows);

      if (insertError) {
        debug.push(`Грешка при вмъкване на задачи за ${user.id}: ${insertError.message}`);
      } else {
        debug.push(`Успешно вмъкнати задачи за ${user.id}`);
      }
    }

    return NextResponse.json({ ok: true, debug });
  } catch (err: any) {
    return NextResponse.json({ ok: false, debug: [`Грешка при изпълнение на cron: ${err.message}`] });
  }
};
