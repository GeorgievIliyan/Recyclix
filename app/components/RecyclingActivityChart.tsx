'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import colors from 'tailwindcss/colors'
import { Zap } from 'lucide-react'

interface ActivityData {
  date: string
  items: number
}

interface RecyclingActivityChartProps {
  data: ActivityData[]
}

export function RecyclingActivityChart({ data }: RecyclingActivityChartProps) {
  const hasData = data && data.length > 0
  
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-border dark:border-neutral-700 shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border dark:border-neutral-700 flex flex-row gap-3 items-center justify-items-center">
        <Zap className='h-8 w-8 text-yellow-400'/>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Активност</h3>
          <p className="text-xs sm:text-sm text-muted-foreground dark:text-neutral-400">Последните 7 дни</p>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              {/* Линии */}
              <CartesianGrid
                stroke={colors.gray[200]}
                strokeDasharray="3 3"
                vertical={false}
                className="dark:opacity-30"
              />

              {/* Абциса */}
              <XAxis 
                dataKey="date" 
                stroke={colors.gray[500]}
                tickLine={false}
                fontSize={12}
              />

              {/* Ордината */}
              <YAxis 
                stroke={colors.gray[500]}
                tickLine={false}
                fontSize={12}
              />

              {/* Помощ */}
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.white,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: colors.gray[900] }}
                itemStyle={{ color: colors.green[500] }}
                cursor={{ fill: 'rgba(34,197,94,0.1)' }}
              />

              <Bar 
                dataKey="items" 
                fill={colors.green[500]}
                radius={[6, 6, 0, 0]}
                onMouseOver={(data, index) => {}}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Няма скорошна активност</p>
          </div>
        )}
      </div>
    </div>
  )
}
