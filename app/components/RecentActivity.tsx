import { Clock, Sparkles } from 'lucide-react'

interface Activity {
  material: string
  points: number
  date: string
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const hasActivities = activities && activities.length > 0
  
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-border dark:border-neutral-700 shadow-md">
      <div className="p-4 sm:p-6 border-b border-border dark:border-neutral-700">
        <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-foreground dark:text-white">
          <Clock className="h-5 w-5 dark:text-gray-300" />
          Скорошна активност
        </h3>
      </div>
      <div className="p-4 sm:p-6">
        {hasActivities ? (
          <div 
            className={`
              ${activities.length > 3 ? 'max-h-64 overflow-y-auto pr-2' : ''}
              space-y-3 sm:space-y-4
            `}
          >
            {activities.map((activity, index) => (
              <div 
                key={index}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 dark:bg-neutral-800/50 hover:bg-muted dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground dark:text-white truncate">
                    {activity.material}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                    {activity.date}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-amber-500 dark:text-amber-400">
                    +{activity.points} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground dark:text-gray-400 text-sm">Няма скорошна активност</p>
          </div>
        )}
      </div>
    </div>
  )
}
