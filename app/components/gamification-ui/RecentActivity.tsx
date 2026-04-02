import { Clock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPreferredLanguage } from "@/lib/utils";

interface Activity {
  material: string;
  points: number;
  date: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const MATERIAL_TRANSLATIONS: Record<string, string> = {
  paper: "gamification.recentActivity.materials.paper",
  plastic: "gamification.recentActivity.materials.plastic",
  glass: "gamification.recentActivity.materials.glass",
  metal: "gamification.recentActivity.materials.metal",
  organic: "gamification.recentActivity.materials.organic",
  electronics: "gamification.recentActivity.materials.electronics",
  textiles: "gamification.recentActivity.materials.textiles",
  general: "gamification.recentActivity.materials.general",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const { t, i18n } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const hasActivities = activities && activities.length > 0;

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

  const formatMaterial = (material: string) => {
    const key = MATERIAL_TRANSLATIONS[material.toLowerCase()] || "gamification.recentActivity.materials.general";
    const translated = t(key);
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  };

  return (
    <div className="group relative bg-white/70 dark:bg-zinc-900 backdrop-blur-xl dark:backdrop-blur-none rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-md hover:shadow-lg hover:border-green-500/30 transition-all duration-300 overflow-hidden">
      <div className="relative z-10 p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground dark:text-white">
          <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </div>
          {t("gamification.recentActivity.title", { defaultValue: "Скорошна активност" })}
        </h3>
      </div>
      <div className="relative z-10 p-3 sm:p-4 md:p-6">
        {hasActivities ? (
          <div
            className={`
              ${activities.length > 3 ? "max-h-56 sm:max-h-64 overflow-y-auto pr-1 sm:pr-2" : ""}
              space-y-2 sm:space-y-3
            `}
          >
            {activities.map((activity, index) => (
              <div
                key={index}
                className="group/item flex items-start justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/50 hover:bg-green-500/10 dark:hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition-all duration-300"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground dark:text-white truncate">
                    {formatMaterial(activity.material)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground dark:text-gray-400 mt-0.5 sm:mt-1">
                    {activity.date}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 group-hover/item:scale-110 transition-transform duration-300">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-xs sm:text-sm font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap">
                    +{activity.points} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground dark:text-gray-400 text-sm">
              {t("gamification.recentActivity.noActivity", { defaultValue: "Няма скорошна активност" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}