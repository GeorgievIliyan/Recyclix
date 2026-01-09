"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-browser"
import ConfirmCamera from "@/app/components/ConfirmCamera"
import { CheckCircle2, Circle, Calendar, Trophy, Loader2, Clock } from "lucide-react"

interface Task {
  id: string
  completed: boolean
  date: string
  created_at: string
  task_id: string
  user_id?: string
  task: {
    title: string
    description: string
    points: number
  } | null
}

export default function DailyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  useEffect(() => {
    // Зареждане на дневните задачи при първоначално рендериране
    const fetchTasks = async () => {
      try {
        // Взимаме текущия логнат потребител
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return setError("Не сте логнати")

        // Филтриране на задачите за днешната дата
        const today = new Date().toISOString().slice(0, 10)
        const { data, error } = await supabase
          .from("user_daily_tasks")
          .select(`*, task:tasks_pool(*)`)
          .eq("user_id", user.id)
          .eq("date", today)
          .order("created_at")

        if (error) throw error
        setTasks(data || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  // Маркиране на задача като завършена и локално обновяване
  const handleCompleteTask = async (id: string) => {
    setCompletingTaskId(id)
    await supabase.from("user_daily_tasks").update({ completed: true }).eq("id", id)
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, completed: true } : x)))
    setCompletingTaskId(null)
  }

  // Показване на loader при зареждане
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )

  // Показване на грешка при неуспех
  if (error)
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>

  // Съобщение при липса на задачи за днес
  if (!tasks.length)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <Calendar className="h-10 w-10" />
        <p>Няма задачи за днес</p>
      </div>
    )

  return (
    <div className="min-h-screen p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-white">Дневни задачи</h1>
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-6 border rounded-lg ${task.completed ? "bg-green-900 border-green-700" : "bg-gray-800 border-gray-700"}`}
          >
            <div className="flex gap-4">
              {/* Икона за завършена/незавършена задача */}
              {task.completed ? (
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              ) : (
                <Circle className="h-6 w-6 text-gray-400" />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{task.task?.title}</h3>
                <p className="text-gray-300">{task.task?.description}</p>

                {/* Показване на точки и време на създаване */}
                <div className="flex gap-2 mt-2">
                  <span className="px-3 py-1 bg-yellow-700 rounded-lg text-sm flex items-center gap-1">
                    <Trophy className="h-4 w-4" /> {task.task?.points}
                  </span>
                  <span className="px-3 py-1 bg-gray-700 rounded-lg text-sm flex items-center gap-1">
                    <Clock className="h-4 w-4" />{" "}
                    {new Date(task.created_at).toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Ако задачата не е завършена, показваме компонента за потвърждение чрез камера */}
            {!task.completed && (
              <div className="mt-4">
                <ConfirmCamera
                  userDailyTaskId={task.id}
                  onConfirm={(success: boolean) => {
                    if (success) handleCompleteTask(task.id)
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}