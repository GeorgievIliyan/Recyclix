import { TrendingUp, Star } from "lucide-react";

interface GamificationProgressProps {
  totalXp: number;
}

// Формула за нива, ниво n+1 = 120% от ниво n
export function computeLevelFromXp(totalXp: number) {
  let level = 1;
  let currentXp = totalXp;
  let xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));

  while (currentXp >= xpForNextLevel) {
    currentXp -= xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  }

  return { level, currentXp, xpForNextLevel };
}

export function GamificationProgress({ totalXp }: GamificationProgressProps) {
  const { level, currentXp, xpForNextLevel } = computeLevelFromXp(totalXp);
  const progressPercentage = (currentXp / xpForNextLevel) * 100;

  return (
    <div className="group relative h-fit backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-md hover:shadow-xl hover:border-green-500/30 transition-all duration-300 overflow-hidden">
      {/* Декоративен градиент във фона */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full blur-2xl" />

      <div className="relative z-10">
        <div className="p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 sm:gap-3 text-card-foreground">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-lime-500/20 to-lime-600/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-lime-500" />
            </div>
            Прогрес
          </h3>
        </div>

        <div className="p-3 pb-4 sm:p-4 sm:pb-5 md:p-6 md:pb-8 space-y-3 sm:space-y-4 md:space-y-6">
          {/* Диспей за ниво */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="relative">
              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">
                Сегашно ниво
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 bg-clip-text text-transparent">
                {level}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">
                Следващо ниво
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-muted-foreground">
                {level + 1}
              </p>
            </div>
          </div>

          {/* Бар за прогрес */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">XP точки</span>
              <span className="font-semibold text-card-foreground">
                {currentXp} / {xpForNextLevel} XP
              </span>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-zinc-100 to-zinc-200/80 dark:from-zinc-800 dark:to-zinc-700/80 rounded-full overflow-hidden dark:border-zinc-700/50">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 rounded-full transition-all duration-500 shadow-lg shadow-green-500/30"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {xpForNextLevel - currentXp} XP точки за следващо ниво
            </p>
          </div>

          {/* Съвети */}
          <div className="relative flex items-start gap-2 p-2.5 sm:p-3 md:p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-800/60 dark:to-zinc-900/60 rounded-lg hover:border-green-500/30 transition-all duration-300 overflow-hidden">
            {/* Деликатен градиент при hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 p-1 sm:p-1.5 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 rounded-md sm:rounded-lg shadow-md flex-shrink-0">
              <Star
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white"
                fill="currentColor"
              />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="text-xs font-semibold text-card-foreground">
                Продължавай
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                Изпълнявай дневни задачи и получавай XP точки!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
