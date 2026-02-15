import { Clock, Sparkles } from "lucide-react";

interface Activity {
  material: string;
  points: number;
  date: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const MATERIAL_TRANSLATIONS: Record<string, string> = {
  paper: "Хартия",
  plastic: "Пластмаса",
  glass: "Стъкло",
  metal: "Метал",
  organic: "Органични",
  electronics: "Електроника",
  textiles: "Текстил",
  general: "Общи отпадъци",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const hasActivities = activities && activities.length > 0;

  const formatMaterial = (material: string) => {
    const translated =
      MATERIAL_TRANSLATIONS[material.toLowerCase()] || material;
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  };

  return (
    <div className="group relative bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-neutral-900/70 dark:via-neutral-900/60 dark:to-neutral-800/70 rounded-xl shadow-md hover:shadow-lg hover:border-green-500/30 dark:hover:border-green-500/30 transition-all duration-300 overflow-hidden">
      {/* Деликатен градиентен акцент */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 p-3 sm:p-4 md:p-6 border-b border-border dark:border-neutral-700">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 text-foreground dark:text-white">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </div>
          Скорошна активност
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
                className="group/item flex items-start justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 dark:from-neutral-800/50 dark:to-neutral-800/30 hover:from-green-500/10 hover:to-emerald-400/10 dark:hover:from-green-500/10 dark:hover:to-emerald-400/10 border border-transparent hover:border-green-500/20 transition-all duration-300"
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
                  <span className="text-xs sm:text-sm font-semibold bg-gradient-to-br from-amber-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap">
                    +{activity.points} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground dark:text-gray-400 text-sm">
              Няма скорошна активност
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
