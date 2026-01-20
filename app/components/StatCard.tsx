import React from "react"
// интефейс за типизация
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}
// фунцкия за карта за бърза информация
export function StatCard({ title, value, icon, iconColor, iconBg }: StatCardProps) {
  const displayValue = value || 0
  
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-card-foreground">
              {displayValue}
            </p>
          </div>
          <div className={`rounded-xl p-2 sm:p-3 ${iconBg} shrink-0`}>
            <div className={iconColor}>
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
