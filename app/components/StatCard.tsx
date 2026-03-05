import React from "react";
// интефейс за типизация
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}
// фунцкия за карта за бърза информация
export function StatCard({
  title,
  value,
  icon,
  iconColor,
  iconBg,
}: StatCardProps) {
  const displayValue = value || 0;

  return (
    <div className="group relative bg-white/70 dark:bg-zinc-900 backdrop-blur-xl dark:backdrop-blur-none rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-green-500/30">
      <div className="relative z-10 p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1 truncate">
              {title}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-card-foreground">
              {displayValue}
            </p>
          </div>
          <div
            className={`rounded-lg sm:rounded-xl p-2 ${iconBg} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
          >
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
}