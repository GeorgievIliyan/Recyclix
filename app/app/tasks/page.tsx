"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import ConfirmCamera from "@/app/components/ConfirmCamera";
import { FreeCamera } from "@/app/components/FreeCamera";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Trophy,
  Clock,
  PartyPopper,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RecyclingLoader } from "@/app/components/RecyclingLoader";
import { Navigation } from "@/app/components/Navigation";

interface Task {
  id: string;
  completed: boolean;
  date: string;
  created_at: string;
  task_id: string;
  user_id?: string;
  task: {
    title: string;
    description: string;
    points: number;
  } | null;
}

export default function DailyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpenForTask, setCameraOpenForTask] = useState<string | null>(
    null,
  );

  // Зареждане на задачите за деня
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return router.push("/auth/login");

        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("user_daily_tasks")
          .select(`*, task:tasks_pool(*)`)
          .eq("user_id", user.id)
          .eq("date", today)
          .order("created_at");

        if (error) throw error;
        setTasks(data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // Маркиране на задача като завършена
  const handleCompleteTask = async (id: string) => {
    await supabase
      .from("user_daily_tasks")
      .update({ completed: true })
      .eq("id", id);
    setTasks((t) =>
      t.map((x) => (x.id === id ? { ...x, completed: true } : x)),
    );
    setCameraOpenForTask(null);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalPoints = tasks.reduce(
    (sum, t) => sum + (t.completed ? t.task?.points || 0 : 0),
    0,
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RecyclingLoader />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500/10 to-red-600/10 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Грешка</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );

  return (
    <>
      <Navigation />

      <div className="relative min-h-screen bg-background py-8 md:pt-16 lg:pt-18 overflow-hidden">
        {/* Фонови декорации */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-[#00CD56]/15 via-[#00b849]/10 to-transparent dark:from-[#00CD56]/8 dark:via-[#00b849]/5 dark:to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-tl from-emerald-400/12 via-[#00CD56]/8 to-transparent dark:from-emerald-400/6 dark:via-[#00CD56]/4 dark:to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-gradient-to-tr from-[#00b849]/10 to-transparent dark:from-[#00b849]/5 dark:to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Заглавие и текст */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-50 dark:to-zinc-200 bg-clip-text text-transparent mb-3">
              Дневни задачи
            </h1>
            <p className="text-muted-foreground">
              Завършете задачите си и спечелете точки
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Списък със задачи */}
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`
                  group relative overflow-hidden rounded-2xl border transition-all duration-300
                  ${
                    task.completed
                      ? "bg-gradient-to-br from-[#00CD56]/8 via-emerald-400/5 to-[#00b849]/8 dark:from-[#00CD56]/5 dark:via-emerald-400/3 dark:to-[#00b849]/5 border-[#00CD56]/30 shadow-lg shadow-[#00CD56]/10"
                      : "backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 border-zinc-200/50 dark:border-zinc-800/50 hover:border-[#00CD56]/40 hover:shadow-xl hover:shadow-[#00CD56]/5 hover:scale-[1.02]"
                  }
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "fadeInSimple 0.5s ease-out forwards",
                }}
              >
                {/* Горна линия за завършени задачи */}
                {task.completed && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00CD56] via-emerald-500 to-[#00b849]" />
                )}

                {/* Деликатен overlay при hover */}
                {!task.completed && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00CD56]/5 via-transparent to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}

                <div className="relative z-10 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {task.completed ? (
                        <div className="relative">
                          <CheckCircle2 className="h-6 w-6 text-[#00CD56]" />
                          <div className="absolute inset-0 bg-[#00CD56]/20 blur-lg rounded-full" />
                        </div>
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground group-hover:text-[#00CD56] transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base font-semibold mb-1 line-clamp-2 ${task.completed ? "text-[#00CD56]" : ""}`}
                      >
                        {task.task?.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    {task.task?.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-br from-[#00CD56]/15 to-emerald-400/15 dark:from-[#00CD56]/20 dark:to-emerald-400/20 text-[#00CD56] text-xs font-medium border border-[#00CD56]/20">
                      <Trophy className="h-3 w-3" />
                      {task.task?.points} т.
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-br from-zinc-100/80 to-zinc-50/80 dark:from-zinc-800/50 dark:to-zinc-700/50 text-muted-foreground text-xs border border-zinc-200/50 dark:border-zinc-700/50">
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
                          if (success) handleCompleteTask(task.id);
                          setCameraOpenForTask(null);
                        }}
                        inlineMode={true}
                      />
                    </div>
                  ) : !task.completed ? (
                    <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <button
                        onClick={() => setCameraOpenForTask(task.id)}
                        className="group/btn relative w-full px-4 py-2.5 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md shadow-[#00CD56]/20 hover:shadow-lg hover:shadow-[#00CD56]/30 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                      >
                        <span className="relative z-10">
                          Отвори камера за задача
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {/* Карта за свободно сканиране */}
            <div
              style={{
                animationDelay: `${tasks.length * 50}ms`,
                animation: "fadeInSimple 0.5s ease-out forwards",
              }}
            >
              <FreeCamera task="Classify the recycling objects" />
            </div>
          </div>

          {/* Съобщение за успех при завършване на всички задачи */}
          {completedCount === tasks.length && tasks.length > 0 && (
            <div className="relative mt-8 p-8 rounded-2xl bg-gradient-to-br from-[#00CD56]/10 via-emerald-400/8 to-[#00b849]/10 dark:from-[#00CD56]/10 dark:via-emerald-400/5 dark:to-[#00b849]/10 border border-[#00CD56]/30 text-center overflow-hidden shadow-xl">
              {/* Декоративни градиенти */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#00CD56]/20 to-transparent rounded-full blur-2xl" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-emerald-400/20 to-transparent rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00CD56]/30 to-emerald-400/30 mb-4 shadow-lg shadow-[#00CD56]/20">
                  <Trophy className="h-8 w-8 text-[#00CD56]" />
                </div>
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                  Поздравления!{" "}
                  <PartyPopper className="h-6 w-6 text-[#00CD56]" />
                </h3>
                <p className="text-muted-foreground">
                  Завършихте всички задачи за днес и спечелихте{" "}
                  <span className="font-bold text-[#00CD56]">
                    {totalPoints} точки
                  </span>
                  !
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInSimple {
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
    </>
  );
}
