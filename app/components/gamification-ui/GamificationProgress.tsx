import { TrendingUp, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPreferredLanguage } from "@/lib/utils";

interface GamificationProgressProps {
  totalXp: number;
  className?: string;
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

export function GamificationProgress({ totalXp, className }: GamificationProgressProps) {
  const { t, i18n } = useTranslation("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const preferredLang = getPreferredLanguage();
    if (i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang);
    }
    document.documentElement.lang = preferredLang;
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) {
    return null;
  }

  const { level, currentXp, xpForNextLevel } = computeLevelFromXp(totalXp);
  const progressPercentage = (currentXp / xpForNextLevel) * 100;

  return (
    <div className={`group relative h-fit bg-white/70 dark:bg-zinc-900 backdrop-blur-xl dark:backdrop-blur-none rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-md hover:shadow-xl hover:border-green-500/30 transition-all duration-300 overflow-hidden ${className ?? ""}`}>
      <div className="relative z-10">
        <div className="p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 sm:gap-3 text-card-foreground">
            <div className="p-1.5 sm:p-2 bg-lime-500/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-lime-500" />
            </div>
            {t("gamification.progress.title", { defaultValue: "Прогрес" })}
          </h3>
        </div>

        <div className="p-3 pb-4 sm:p-4 sm:pb-5 md:p-6 md:pb-8 space-y-3 sm:space-y-4 md:space-y-6">
          {/* Диспей за ниво */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="relative">
              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">
                {t("gamification.progress.currentLevel", { defaultValue: "Сегашно ниво" })}
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-500">
                {level}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5 sm:mb-1">
                {t("gamification.progress.nextLevel", { defaultValue: "Следващо ниво" })}
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-muted-foreground">
                {level + 1}
              </p>
            </div>
          </div>

          {/* Бар за прогрес */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">{t("gamification.progress.xpPoints", { defaultValue: "XP точки" })}</span>
              <span className="font-semibold text-card-foreground">
                {currentXp} / {xpForNextLevel} XP
              </span>
            </div>
            <div className="relative h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 rounded-full transition-all duration-500 shadow-lg shadow-green-500/30"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t("gamification.progress.xpToNextLevel", { xp: xpForNextLevel - currentXp })}
            </p>
          </div>

          {/* Съвети */}
          <div className="flex items-start gap-2 p-2.5 sm:p-3 md:p-4 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-lg">
            <div className="p-1 sm:p-1.5 bg-amber-400 rounded-md sm:rounded-lg shadow-md flex-shrink-0">
              <Star
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white"
                fill="currentColor"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-card-foreground">
                {t("gamification.progress.keepGoing", { defaultValue: "Продължавай" })}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                {t("gamification.progress.keepGoingText", { defaultValue: "Изпълнявай дневни задачи и получавай XP точки!" })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}