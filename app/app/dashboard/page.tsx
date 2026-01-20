'use client'

import { useEffect, useState } from 'react'
import { Recycle, Sparkles, Flame, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

import { StatCard } from '@/app/components/StatCard'
import { RecyclingActivityChart } from '@/app/components/RecyclingActivityChart'
import { MaterialsBreakdownChart } from '@/app/components/MaterialsBreakdownChart'
import { GamificationProgress } from '@/app/components/GamificationProgress'
import { RecentActivity } from '@/app/components/RecentActivity'

type Profile = {
  username: string
  level: number
  xp: number
}

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
  const [userData, setUserData] = useState<UserData | null>(null)
  const [activityData, setActivityData] = useState<ActivityPoint[]>([])
  const [materialsData, setMaterialsData] = useState<MaterialPoint[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        console.log('Loading dashboard...')
        
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // First, check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('Session check:', { hasSession: !!session, error: sessionError })
        
        if (sessionError) {
          console.error('Session error:', sessionError)
        }
        
        if (!session) {
          console.log('No session found, trying getUser...')
          // Try getUser as fallback
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          
          if (userError) {
            console.error('Get user error:', userError)
            setLoading(false)
            return
          }
          
          if (!user) {
            console.log('No user found, redirecting to login...')
            router.push('/auth/login')
            return
          }
          
          console.log('User found via getUser:', user.id)
          await fetchUserData(supabase, user.id)
        } else {
          console.log('Session found, user:', session.user.id)
          await fetchUserData(supabase, session.user.id)
        }
        
      } catch (err) {
        console.error('Error in dashboard load:', err)
        setLoading(false)
      }
    }

    async function fetchUserData(supabase: any, userId: string) {
      try {
        console.log('Fetching data for user:', userId)
        
        // Get user info from auth.users
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Auth user error:', userError)
        }
        
        // Get username from auth user (email or metadata)
        const username = userData?.user?.email?.split('@')[0] || 
                        userData?.user?.user_metadata?.username || 
                        'Guest'
        
        // Fetch profile data (gamification)
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('level, xp')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          if (profileError.code === 'PGRST116') {
            console.log('No profile exists yet - using defaults')
          }
        }

        // Fetch recycling events
        const { data: events = [], error: eventsError } = await supabase
          .from('recycling_events')
          .select('material, points, co2_saved, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (eventsError) {
          console.error('Events error:', eventsError)
        }

        const typedEvents = events as RecyclingEvent[]

        // Calculate streak
        const calculateStreak = () => {
          if (typedEvents.length === 0) return 0
          
          const sortedDates = typedEvents
            .map(e => new Date(e.created_at).toDateString())
            .sort((a, b) => b.localeCompare(a))
          
          const uniqueDates = [...new Set(sortedDates)]
          let streak = 1
          let lastDate = new Date(uniqueDates[0])
          
          for (let i = 1; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i])
            const diffDays = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
            
            if (diffDays === 1) {
              streak++
              lastDate = currentDate
            } else {
              break
            }
          }
          
          return streak
        }

        const totalItems = typedEvents.length
        const totalPoints = typedEvents.reduce((s, e) => s + e.points, 0)
        const co2Saved = typedEvents.reduce((s, e) => s + e.co2_saved, 0)

        // Set user data
        setUserData({
          username: username, // Now using username from auth
          level: profile?.level || 0,
          xp: profile?.xp || 0,
          xpForNextLevel: 100,
          totalItems,
          totalPoints,
          co2Saved,
          currentStreak: calculateStreak(),
        })

        // Prepare activity chart data
        const activityMap = typedEvents.reduce<Record<string, ActivityPoint>>(
          (acc, e) => {
            const date = new Date(e.created_at)
            const day = date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })
            acc[day] ??= { date: day, items: 0 }
            acc[day].items++
            return acc
          },
          {}
        )

        setActivityData(Object.values(activityMap))

        // Prepare materials breakdown data
        const materialMap = typedEvents.reduce<Record<string, number>>(
          (acc, e) => {
            acc[e.material] = (acc[e.material] ?? 0) + 1
            return acc
          },
          {}
        )

        const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
        const materialEntries = Object.entries(materialMap)
        
        setMaterialsData(
          materialEntries.map(([name, value], index) => ({
            name,
            value,
            fill: colors[index % colors.length],
          }))
        )

        // Prepare recent activities
        setRecentActivities(
          [...typedEvents]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5)
            .map(e => ({
              material: e.material,
              points: e.points,
              date: new Date(e.created_at).toLocaleDateString('bg-BG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }),
            }))
        )

        setLoading(false)
        console.log('Dashboard loaded successfully')
        
      } catch (err) {
        console.error('Error fetching user data:', err)
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Зареждане...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Няма данни</h2>
          <p className="text-muted-foreground mb-4">
            Няма намерени данни за този потребител.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Вход
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Общи рециклирани"
            value={userData.totalItems}
            icon={<Recycle className="h-6 w-6" />}
            iconColor="text-green-500"
            iconBg="bg-muted"
          />
          <StatCard
            title="Точки общо"
            value={userData.totalPoints}
            icon={<Sparkles className="h-6 w-6" />}
            iconColor="text-amber-500"
            iconBg="bg-muted"
          />
          <StatCard
            title="Спестени CO₂"
            value={`${userData.co2Saved.toFixed(1)} кг`}
            icon={<Flame className="h-7 w-7" />}
            iconColor="text-yellow-400"
            iconBg="bg-muted"
          />
          <StatCard
            title="Рекорд"
            value={`${userData.currentStreak} дни`}
            icon={<Calendar className="h-6 w-6" />}
            iconColor="text-sky-500"
            iconBg="bg-muted"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
      </div>
    </div>
  )
}