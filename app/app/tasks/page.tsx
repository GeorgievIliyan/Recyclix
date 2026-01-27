"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-browser"
import ConfirmCamera from "@/app/components/ConfirmCamera"
import { CheckCircle2, Circle, Calendar, Trophy, Clock, Sparkles, Target, PartyPopper } from "lucide-react"
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
      <div className="min-h-screen bg-background">
          <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#00CD56]/10 border border-[#00CD56]/20">
                    <Target className="h-5 w-5 text-[#00CD56]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Дневни задачи</h1>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString("bg-BG", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                {/* Статистики */}
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                    <CheckCircle2 className="h-4 w-4 text-[#00CD56]" />
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Завършени</div>
                      <div className="text-sm font-bold text-foreground">
                        {completedCount}/{tasks.length}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00CD56]/10 border border-[#00CD56]/20">
                    <Trophy className="h-4 w-4 text-[#00CD56]" />
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Точки</div>
                      <div className="text-sm font-bold text-foreground">{totalPoints}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00CD56] to-[#00ff6a] transition-all duration-500 ease-out"
                    style={{ width: `${(completedCount / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

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
                    <div className="flex items-start gap-3 mb-3">
                      {/* Статус икона */}
                      <div className="flex-shrink-0 mt-0.5">
                        {task.completed ? (
                          <div className="relative">
                            <CheckCircle2 className="h-6 w-6 text-[#00CD56]" />
                            <Sparkles className="h-3 w-3 text-[#00CD56] absolute -top-1 -right-1" />
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
                    {!task.completed && (
                      <div className="pt-4 border-t border-border">
                        <ConfirmCamera
                          userDailyTaskId={task.id}
                          onConfirm={(success: boolean) => {
                            if (success) handleCompleteTask(task.id)
                          }}
                        />
                      </div>
                    )}
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
