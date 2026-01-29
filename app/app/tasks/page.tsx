"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-browser"
import ConfirmCamera from "@/app/components/ConfirmCamera"
import { CheckCircle2, Circle, Calendar, Trophy, Clock, Sparkles, Target, PartyPopper, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { RecyclingLoader } from "@/app/components/RecyclingLoader"
import { Navigation } from "@/app/components/Navigation"

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
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [cameraOpenForTask, setCameraOpenForTask] = useState<string | null>(null)

  useEffect(() => {
    // Зареждане на дневните задачи при първоначално рендериране
    const fetchTasks = async () => {
      try {
        // Взимаме текущия логнат потребител
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return router.push("/auth/login")

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
    setCameraOpenForTask(null)
  }

  // Изчисляване на статистики
  const completedCount = tasks.filter((t) => t.completed).length
  const totalPoints = tasks.reduce((sum, t) => sum + (t.completed ? t.task?.points || 0 : 0), 0)

  // Показване на loader при зареждане
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <RecyclingLoader />
        </div>
      </div>
    )
  }

  // Показване на грешка при неуспех
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Грешка</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  // Съобщение при липса на задачи за днес
  if (!tasks.length) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-green-500/10 mb-6">
              <Calendar className="h-14 w-14 text-green-500" />
            </div>
            <h2 className="text-3xl font-semibold mb-2">Няма задачи</h2>
            <p className="text-muted-foreground text-md">Все още нямате задачи за днес. <br />Проверете отново по-късно!</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background py-8 md:pt-16 lg:pt-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`
                  group relative overflow-hidden rounded-xl border transition-all duration-300
                  ${
                    task.completed
                      ? "bg-[#00CD56]/5 border-[#00CD56]/30 shadow-sm"
                      : "bg-card border-border hover:border-[#00CD56]/40 hover:shadow-lg hover:shadow-[#00CD56]/5"
                  }
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "fadeIn 0.5s ease-out forwards",
                }}
              >
                {/* Декоративен акцент за завършени задачи */}
                {task.completed && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00CD56] to-[#00ff6a]" />
                )}

                <div className="p-5">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {/* Статус икона */}
                    <div className="flex-shrink-0 mt-0.5">
                      {task.completed ? (
                        <div className="relative">
                          <CheckCircle2 className="h-6 w-6 text-[#00CD56]" />
                        </div>
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground group-hover:text-[#00CD56] transition-colors" />
                      )}
                    </div>
                    {/* Съдържание */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base font-semibold mb-1 line-clamp-2 ${task.completed ? "text-foreground" : "text-foreground"}`}
                      >
                        {task.task?.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    {task.task?.description}
                  </p>

                  {/* Метаданни */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00CD56]/10 text-[#00CD56] text-xs font-medium">
                      <Trophy className="h-3 w-3" />
                      {task.task?.points} т.
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                      <Clock className="h-3 w-3" />
                      {new Date(task.created_at).toLocaleTimeString("bg-BG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Компонент за потвърждение */}
                  {!task.completed && cameraOpenForTask === task.id ? (
                    <div className="pt-4 border-t border-border">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-foreground">Потвърди със снимка</h4>
                          <button
                            onClick={() => setCameraOpenForTask(null)}
                            className="text-xs text-muted-foreground hover:text-red-500 transition duration-150 flex items-center gap-1"
                          >
                            <X className="h-4 w-4" />
                            Затвори
                          </button>
                        </div>
                        <ConfirmCamera
                          userDailyTaskId={task.id}
                          onConfirm={(success: boolean) => {
                            if (success) handleCompleteTask(task.id)
                            setCameraOpenForTask(null)
                          }}
                          inlineMode={true}
                        />
                      </div>
                    </div>
                  ) : !task.completed ? (
                    <div className="pt-4 border-t border-border">
                      <button
                        onClick={() => setCameraOpenForTask(task.id)}
                        className="group relative w-full px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Отвори камера
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Мотивационно съобщение при завършване */}
          {completedCount === tasks.length && (
            <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-[#00CD56]/10 to-[#00ff6a]/10 border border-[#00CD56]/30 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00CD56]/20 mb-4">
                <Trophy className="h-8 w-8 text-[#00CD56]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Поздравления! <PartyPopper className="h-6 w-6"/></h3>
              <p className="text-muted-foreground">Завършихте всички задачи за днес и спечелихте {totalPoints} точки!</p>
            </div>
          )}
        </div>

        {/* Fade-in анимация */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  )
}