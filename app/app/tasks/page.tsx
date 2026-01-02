"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-browser"

export default function DailyTasksPage() {
  // Състояния за списъка със задачи и зареждането
  const [tasks, setTask] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      // Днешна дата в ISO формат (YYYY-MM-DD)
      const today = new Date().toISOString().slice(0, 10)

      // Вземане на текущия потребител
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false)
        return
      }

      // Извличане на задачите за текущия потребител и дата
      const { data, error } = await supabase
        .from("user_daily_tasks")
        .select(`
          id,
          completed,
          task:tasks_pool (
            id,
            title,
            description,
            points
          )
        `)
        .eq("user_id", user.id) // филтриране по потребител
        .eq("date", today)      // филтриране по днешна дата
        .order("created_at", { ascending: true }); // сортиране по дата на създаване
        
      if (!error){
        setTask(data || [])
      }
      setLoading(false)
    }

    // Извикване на функцията за зареждане на задачи
    fetchTasks()
  }, [])

  // Показване на съобщение за зареждане
  if (loading) return <p>Зареждане...</p>

  // Ако няма задачи за днес
  if (tasks.length === 0){
    return <p>Няма задачи за днес.</p>
  }

  // Извеждане на задачите
  return (
    <div>
      <h1>Задачи за днес</h1>

      {tasks.map(t => (
        <div key={t.id}>
          <h3>{t.task.title}</h3>
          <p>{t.task.description}</p>
          <p>Точки: {t.task.points}</p>
          <p>Статус: {t.completed ? "Завършена" : "В процес"}</p>
        </div>
      ))}
    </div>
  );
}
