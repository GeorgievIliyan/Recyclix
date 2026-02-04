'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-browser"
import ConfirmCamera from "@/app/components/ConfirmCamera"
import { FreeCamera } from "@/app/components/FreeCamera"
import { CheckCircle2, Circle, Calendar, Trophy, Clock, PartyPopper, X } from "lucide-react"
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
  const [cameraOpenForTask, setCameraOpenForTask] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push("/auth/login")

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

  const handleCompleteTask = async (id: string) => {
    await supabase.from("user_daily_tasks").update({ completed: true }).eq("id", id)
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, completed: true } : x)))
    setCameraOpenForTask(null)
  }

  const completedCount = tasks.filter((t) => t.completed).length
  const totalPoints = tasks.reduce((sum, t) => sum + (t.completed ? t.task?.points || 0 : 0), 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <RecyclingLoader />
    </div>
  )

  if (error) return (
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

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-background py-8 md:pt-16 lg:pt-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Task Cards */}
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`
                  group relative overflow-hidden rounded-xl border transition-all duration-300
                  ${task.completed
                    ? "bg-[#00CD56]/5 border-[#00CD56]/30 shadow-sm"
                    : "bg-card border-border hover:border-[#00CD56]/40 hover:shadow-lg hover:shadow-[#00CD56]/5"
                  }
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "fadeIn 0.5s ease-out forwards",
                }}
              >
                {task.completed && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00CD56] to-[#00ff6a]" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {task.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-[#00CD56]" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground group-hover:text-[#00CD56] transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-1 line-clamp-2">{task.task?.title}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    {task.task?.description}
                  </p>

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

                  {!task.completed && cameraOpenForTask === task.id ? (
                    <div className="pt-4 border-t border-border">
                      <ConfirmCamera
                        userDailyTaskId={task.id}
                        onConfirm={(success: boolean) => {
                          if (success) handleCompleteTask(task.id)
                          setCameraOpenForTask(null)
                        }}
                        inlineMode={true}
                      />
                    </div>
                  ) : !task.completed ? (
                    <div className="pt-4 border-t border-border">
                      <button
                        onClick={() => setCameraOpenForTask(task.id)}
                        className="group relative w-full px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Open Task Camera
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {/* Free Scan Card - Now using the redesigned FreeCamera component */}
            <div
              style={{ 
                animationDelay: `${tasks.length * 50}ms`,
                animation: "fadeIn 0.5s ease-out forwards" 
              }}
            >
              <FreeCamera task="Classify the recycling objects" />
            </div>

          </div>

          {completedCount === tasks.length && tasks.length > 0 && (
            <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-[#00CD56]/10 to-[#00ff6a]/10 border border-[#00CD56]/30 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00CD56]/20 mb-4">
                <Trophy className="h-8 w-8 text-[#00CD56]" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                Поздравления! <PartyPopper className="h-6 w-6"/>
              </h3>
              <p className="text-muted-foreground">
                Завършихте всички задачи за днес и спечелихте {totalPoints} точки!
              </p>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
