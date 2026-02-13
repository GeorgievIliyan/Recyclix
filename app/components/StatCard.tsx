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
    <div className="group relative bg-gradient-to-br from-card/90 via-card/80 to-card/90 rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-green-500/30">
      {/* Деликатен градиентен overlay при hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-card-foreground via-card-foreground/90 to-card-foreground bg-clip-text text-transparent">
              {displayValue}
            </p>
          </div>
          <div
            className={`rounded-xl p-2 sm:p-3 ${iconBg} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
          >
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
