'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Recycle } from 'lucide-react'

interface MaterialData {
  name: string
  value: number
  fill: string
  [key: string]: any;
}

// Keep keys lowercase here for easy matching
const materialMap: Record<string, string> = {
  glass: 'Стъкло',
  plastic: 'Пластмаса',
  paper: 'Хартия',
  metal: 'Метал',
  organic: 'Органични отпадъци',
  other: 'Други'
}

interface MaterialsBreakdownChartProps {
  data: MaterialData[]
}

export function MaterialsBreakdownChart({ data }: MaterialsBreakdownChartProps) {
  const hasData = data && data.length > 0
  
  const translatedData = useMemo(() => {
    if (!hasData) return []
    return data.map(item => {
      const normalizedKey = item.name?.toLowerCase().trim() || ''
      return {
        ...item,
        name: materialMap[normalizedKey] ?? item.name,
        originalName: item.name
      }
    })
  }, [data, hasData])

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-border dark:border-neutral-700 shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border dark:border-neutral-700 flex flex-row gap-3 items-center justify-items-center">
        <Recycle className='h-8 w-8 text-green-500'/>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">Рециклирани материали</h3>
          <p className="text-xs sm:text-sm text-muted-foreground dark:text-neutral-400">Разпределени по тип</p>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>    
              <Pie
                data={translatedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                activeShape={false} 
                isAnimationActive={true}
              >
                {translatedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill} 
                    stroke="none" 
                    style={{ outline: 'none' }} 
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{
                  color: 'hsl(var(--foreground))', 
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number | string | undefined, name: string | undefined) => [
                  value ?? 0, 
                  name ?? ''
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground dark:text-gray-400 text-sm">Няма данни</p>
          </div>
        )}
      </div>
    </div>
  )
}