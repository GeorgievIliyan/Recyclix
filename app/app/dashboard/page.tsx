'use client'

import { useEffect, useState } from 'react'
import { Recycle, Sparkles, Flame, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RecyclingLoader } from '@/app/components/RecyclingLoader'

import { StatCard } from '@/app/components/StatCard'
import { RecyclingActivityChart } from '@/app/components/RecyclingActivityChart'
import { MaterialsBreakdownChart } from '@/app/components/MaterialsBreakdownChart'
import { GamificationProgress } from '@/app/components/GamificationProgress'
import { RecentActivity } from '@/app/components/RecentActivity'
import { Navigation } from '@/app/components/Navigation'
import { BadgesGallery } from '@/app/components/BadgesGallery'
import { supabase } from '@/lib/supabase-browser'

type RecyclingEvent = {
  material: string
  points: number
  co2_saved: number
  created_at: string
}

type ActivityPoint = {
  date: string
  items: number
}

type MaterialPoint = {
  name: string
  value: number
  fill: string
}

type RecentActivityItem = {
  material: string
  points: number
  date: string
}

type UserData = {
  username: string
  level: number
  xp: number
  xpForNextLevel: number
  totalItems: number
  totalPoints: number
  co2Saved: number
  currentStreak: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [activityData, setActivityData] = useState<ActivityPoint[]>([])
  const [materialsData, setMaterialsData] = useState<MaterialPoint[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: userDataResponse } = await supabase.auth.getUser()
        if (!userDataResponse?.user) {
          router.push('/auth/login')
          return
        }
        setUser(userDataResponse.user)
        const userId = userDataResponse.user.id

        // 2️⃣ Fetch user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('level, xp')
          .eq('id', userId)
          .single()

        // 3️⃣ Fetch user recycling events
        const { data: events = [] } = await supabase
          .from('recycling_events')
          .select('material, points, co2_saved, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        const typedEvents = events as RecyclingEvent[]

        // 4️⃣ Calculate streak
        const calculateStreak = () => {
          if (!typedEvents.length) return 0
          const sortedDates = [...new Set(
            typedEvents.map(e => new Date(e.created_at).toDateString())
          )].sort((a, b) => b.localeCompare(a))

          let streak = 1
          let lastDate = new Date(sortedDates[0])

          for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i])
            const diffDays = Math.floor(
              (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (diffDays === 1) {
              streak++
              lastDate = currentDate
            } else {
              break
            }
          }

          return streak
        }

        // 5️⃣ Aggregate dashboard stats
        const totalItems = typedEvents.length
        const totalPoints = typedEvents.reduce((sum, e) => sum + e.points, 0)
        const co2Saved = typedEvents.reduce((sum, e) => sum + e.co2_saved, 0)

        setUserData({
          username: userDataResponse.user.email?.split('@')[0] || 'Guest',
          level: profile?.level || 0,
          xp: profile?.xp || 0,
          xpForNextLevel: 100,
          totalItems,
          totalPoints,
          co2Saved,
          currentStreak: calculateStreak(),
        })

        // 6️⃣ Activity chart data
        const activityMap = typedEvents.reduce<Record<string, ActivityPoint>>((acc, e) => {
          const day = new Date(e.created_at).toLocaleDateString('bg-BG', {
            day: 'numeric',
            month: 'short',
          })
          acc[day] ??= { date: day, items: 0 }
          acc[day].items++
          return acc
        }, {})
        setActivityData(Object.values(activityMap))

        // 7️⃣ Materials chart data
        const materialMap = typedEvents.reduce<Record<string, number>>((acc, e) => {
          acc[e.material] = (acc[e.material] ?? 0) + 1
          return acc
        }, {})
        const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
        setMaterialsData(
          Object.entries(materialMap).map(([name, value], index) => ({
            name,
            value,
            fill: colors[index % colors.length],
          }))
        )

        // 8️⃣ Recent activities
        setRecentActivities(
          typedEvents
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5)
            .map(e => ({
              material: e.material,
              points: e.points,
              date: new Date(e.created_at).toLocaleDateString('bg-BG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            }))
        )

        setLoading(false)
      } catch (err) {
        console.error('Error loading dashboard:', err)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RecyclingLoader />
      </div>
    )
  }

  return (
    <Navigation activeModule="dashboard" variant="default">
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
          <header className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold">
                  Добре дошъл,{' '}
                  <span className="font-semibold text-foreground text-green-500">
                    {userData.username}
                  </span>
                  !
                </p>
              </div>
              <div className="bg-green-500 text-white px-4 py-2 text-base sm:text-lg rounded-full font-semibold shadow-sm">
                Ниво {userData.level}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Общи рециклирани" value={userData.totalItems} icon={<Recycle className="h-6 w-6" />} iconColor="text-green-500" iconBg="bg-muted" />
            <StatCard title="Точки общо" value={userData.totalPoints} icon={<Sparkles className="h-6 w-6" />} iconColor="text-amber-500" iconBg="bg-muted" />
            <StatCard title="Спестени CO₂" value={`${userData.co2Saved.toFixed(1)} кг`} icon={<Flame className="h-7 w-7" />} iconColor="text-yellow-400" iconBg="bg-muted" />
            <StatCard title="Рекорд" value={`${userData.currentStreak} дни`} icon={<Calendar className="h-6 w-6" />} iconColor="text-sky-500" iconBg="bg-muted" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RecyclingActivityChart data={activityData} />
            <MaterialsBreakdownChart data={materialsData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GamificationProgress totalXp={userData.totalPoints} />
            </div>
            <div>
              <RecentActivity activities={recentActivities} />
            </div>
          </div>

          <div className="my-4">
            <BadgesGallery userId={user?.id} />
          </div>
        </div>
      </div>
    </Navigation>
  )
}
