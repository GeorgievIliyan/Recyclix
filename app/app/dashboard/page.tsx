"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Recycle, Sparkles, Flame, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamicImport from "next/dynamic";
import { RecyclingLoader } from "@/app/components/ui/RecyclingLoader";
import { StatCard } from "@/app/components/gamification-ui/StatCard";
import { GamificationProgress } from "@/app/components/gamification-ui/GamificationProgress";
import { RecentActivity } from "@/app/components/gamification-ui/RecentActivity";
import { Navigation } from "@/app/components/ui/Navigation";
import { BadgesGallery } from "@/app/components/gamification-ui/BadgesGallery";
import { supabase } from "@/lib/supabase-browser";
import { Leaderboard } from "@/app/components/gamification-ui/Leaderboard";

const RecyclingActivityChart = dynamicImport(
  () =>
    import("@/app/components/gamification-ui/RecyclingActivityChart").then(
      (mod) => mod.RecyclingActivityChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-3xl" />
    ),
  },
);

const MaterialsBreakdownChart = dynamicImport(
  () =>
    import("@/app/components/map-ui/MaterialsBreakdownChart").then(
      (mod) => mod.MaterialsBreakdownChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-3xl" />
    ),
  },
);

type RecyclingEvent = {
  material: string;
  points: number;
  co2_saved: number;
  created_at: string;
  count: number;
};

type ActivityPoint = {
  date: string;
  items: number;
};

type MaterialPoint = {
  name: string;
  value: number;
  fill: string;
};

type RecentActivityItem = {
  material: string;
  points: number;
  date: string;
};

type UserData = {
  username: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  totalItems: number;
  totalPoints: number;
  co2Saved: number;
  currentStreak: number;
};

type UserProfile = {
  id: string;
  xp: number;
  level: number;
  trust_score: number;
  streak: number;
  badges: string[];
  app_role: "user" | "platform_admin";
  organization_id?: string;
  organization_role?: "member" | "org_admin";
  username?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  const [materialsData, setMaterialsData] = useState<MaterialPoint[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const loadDashboard = async () => {
      try {
        const { data: userDataResponse } = await supabase.auth.getUser();
        if (!userDataResponse?.user) {
          router.push("/auth/login");
          return;
        }
        setUser(userDataResponse.user);
        const userId = userDataResponse.user.id;

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("level, xp, username")
          .eq("id", userId)
          .single();

        const { data: events = [], error: eventsError } = await supabase
          .from("recycling_events")
          .select("material, points, co2_saved, created_at, count")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

          console.log("User ID:", userId);
          console.log("Events error:", eventsError);
          console.log("Events data:", events);
          console.log("Events count:", events?.length);

        const typedEvents = events as RecyclingEvent[];

        const { data: profiles = [] } = await supabase
          .from("user_profiles")
          .select("id, xp, level, trust_score, streak, badges, app_role, organization_id, organization_role, username");

        setUserProfiles((profiles ?? []) as UserProfile[]);

        const calculateStreak = () => {
          if (!typedEvents.length) return 0;
          const sortedDates = [
            ...new Set(
              typedEvents.map((e) => new Date(e.created_at).toDateString()),
            ),
          ].sort((a, b) => b.localeCompare(a));

          let streak = 1;
          let lastDate = new Date(sortedDates[0]);

          for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);
            const diffDays = Math.floor(
              (lastDate.getTime() - currentDate.getTime()) /
              (1000 * 60 * 60 * 24),
            );
            if (diffDays === 1) {
              streak++;
              lastDate = currentDate;
            } else {
              break;
            }
          }
          return streak;
        };

        // Use event.count instead of counting rows
        const totalItems = typedEvents.reduce((sum, e) => sum + (e.count ?? 1), 0);
        const totalPoints = typedEvents.reduce((sum, e) => sum + e.points, 0);
        const co2Saved = typedEvents.reduce((sum, e) => sum + e.co2_saved, 0);

        setUserData({
          username: profile?.username || userDataResponse.user.email?.split("@")[0] || "Guest",
          level: profile?.level || 0,
          xp: profile?.xp || 0,
          xpForNextLevel: 100,
          totalItems,
          totalPoints,
          co2Saved,
          currentStreak: calculateStreak(),
        });

        const activityMap = typedEvents.reduce<Record<string, ActivityPoint>>(
          (acc, e) => {
            const day = new Date(e.created_at).toLocaleDateString("bg-BG", {
              day: "numeric",
              month: "short",
            });
            acc[day] ??= { date: day, items: 0 };
            // Accumulate by count instead of incrementing by 1
            acc[day].items += e.count ?? 1;
            return acc;
          },
          {},
        );
        setActivityData(Object.values(activityMap));

        const materialMap = typedEvents.reduce<Record<string, number>>(
          (acc, e) => {
            // Accumulate by count instead of incrementing by 1
            acc[e.material] = (acc[e.material] ?? 0) + (e.count ?? 1);
            return acc;
          },
          {},
        );

        const colors = [
          "#22c55e",
          "#3b82f6",
          "#8b5cf6",
          "#f59e0b",
          "#ef4444",
          "#ec4899",
        ];
        setMaterialsData(
          Object.entries(materialMap).map(([name, value], index) => ({
            name,
            value,
            fill: colors[index % colors.length],
          })),
        );

        setRecentActivities(
          typedEvents
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5)
            .map((e) => ({
              material: e.material,
              points: e.points,
              date: new Date(e.created_at).toLocaleDateString("bg-BG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })),
        );

        setLoading(false);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router, isClient]);

  if (loading || !userData || !isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RecyclingLoader />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="relative min-h-screen bg-fixed bg-gradient-to-br from-neutral-50 via-neutral-100 to-zinc-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-black md:pt-16 lg:pt-18 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="absolute top-20 -left-32 w-96 h-96 bg-[#00CD56]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-40 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 container mx-auto px-5 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-7xl">
          <header className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between flex-nowrap gap-4">
              <div>
                <h1 className="text-3xl sm:text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight mb-4 md:mb-2 lg:mb-0">
                  Добре дошъл,{" "}
                  <span className="bg-gradient-to-r from-[#00CD56] to-emerald-500 bg-clip-text text-transparent">
                    {userData.username}
                  </span>
                  !
                </h1>
              </div>
              <div className="shrink-0 relative overflow-hidden bg-[#00CD56] text-white px-4 py-2 rounded-full text-sm sm:text-base font-bold shadow-xl shadow-[#00CD56]/20">
                <span className="relative z-10">Ниво {userData.level}</span>
                <div className="absolute inset-0 bg-white/20 skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              </div>
            </div>
          </header>

          {/* статистики */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <StatCard
              title="Общи рециклирани"
              value={userData.totalItems}
              icon={<Recycle className="h-6 w-6" />}
              iconColor="text-green-500"
              iconBg="bg-green-500/10"
            />
            <StatCard
              title="Точки общо"
              value={userData.xp}
              icon={<Sparkles className="h-6 w-6" />}
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
            />
            <StatCard
              title="Спестени CO₂"
              value={`${userData.co2Saved.toFixed(1)} кг`}
              icon={<Flame className="h-6 w-6 md:h-7 md:w-7" />}
              iconColor="text-yellow-500"
              iconBg="bg-yellow-500/10"
            />
            <StatCard
              title="Рекорд"
              value={`${userData.currentStreak === 1 ? "1 ден" : `${userData.currentStreak} дни`}`}
              icon={<Calendar className="h-6 w-6" />}
              iconColor="text-sky-500"
              iconBg="bg-sky-500/10"
            />
          </div>

          {/* графика */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <RecyclingActivityChart data={activityData} />
            <MaterialsBreakdownChart data={materialsData} />
          </div>

          {/* прогрес */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <GamificationProgress
              totalXp={userData.xp}
              className="lg:col-span-2 backdrop-blur-md bg-white/70 dark:bg-zinc-900 dark:backdrop-blur-none rounded-2xl sm:rounded-3xl border border-white/20 dark:border-zinc-800 shadow-xl overflow-hidden"
            />
            <RecentActivity activities={recentActivities} />
          </div>

          {/* класация */}
          <Leaderboard users={userProfiles} currentUserId={user?.id} />

          {/* значки */}
          <BadgesGallery
            userId={user?.id}
            className="backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden mb-4 sm:mb-6 md:mb-8 mt-8"
          />
        </div>
      </div>
    </>
  );
}