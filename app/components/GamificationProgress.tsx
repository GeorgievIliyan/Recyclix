import { TrendingUp, Star } from 'lucide-react'

interface GamificationProgressProps {
  totalXp: number
}

// Формула за нива, ниво n+1 = 120% от ниво n
function computeLevelFromXp(totalXp: number) {
  let level = 1
  let currentXp = totalXp
  let xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1))

  while (currentXp >= xpForNextLevel) {
    currentXp -= xpForNextLevel
    level++
    xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1))
  }

  return { level, currentXp, xpForNextLevel }
}

export function GamificationProgress({ totalXp }: GamificationProgressProps) {
  const { level, currentXp, xpForNextLevel } = computeLevelFromXp(totalXp)
  const progressPercentage = (currentXp / xpForNextLevel) * 100

  return (
    <div className="bg-card rounded-xl border border-border shadow-md">
      <div className="p-4 sm:p-6 border-b border-border">
        <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-3 text-card-foreground">
          <TrendingUp className='h-8 w-8 text-lime-500'/>
          Прогрес
        </h3>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Диспей за ниво */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Сегашно ниво</p>
            <p className="text-3xl sm:text-4xl font-bold text-card-foreground">{level}</p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Следващо ниво</p>
            <p className="text-3xl sm:text-4xl font-bold text-muted-foreground">{level + 1}</p>
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
          <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {xpForNextLevel - currentXp} XP точки за следващо ниво
          </p>
        </div>

        {/* Съвети */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg border border-border">
          <Star className="h-5 w-5 text-yellow-400" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-card-foreground">Продължавай</p>
            <p className="text-xs text-muted-foreground">
              Изпълнявай дневни задачи и получавай XP точки!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}