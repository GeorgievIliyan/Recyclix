import { Trophy, TrendingUp, Shield, Award } from "lucide-react";
import { computeLevelFromXp } from "./GamificationProgress";
import { supabase } from "@/lib/supabase-browser";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  xp: number;
  level: number; // Полето от базата данни — не го ползваме директно за показване
  trust_score: number;
  streak: number;
  badges: number[];
  app_role: "user" | "platform_admin";
  organization_id?: string;
  organization_role?: "member" | "org_admin";
  username?: string;
}

interface LeaderboardProps {
  currentUserId?: string;
}

const RANK_COLORS = [
  "from-yellow-400 via-amber-400 to-yellow-500",
  "from-zinc-300 via-slate-300 to-zinc-400",
  "from-amber-600 via-orange-500 to-amber-700",
];

const RANK_GLOW = [
  "shadow-yellow-500/20",
  "shadow-zinc-400/20",
  "shadow-amber-600/20",
];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${RANK_COLORS[rank - 1]} flex items-center justify-center shadow-lg ${RANK_GLOW[rank - 1]} flex-shrink-0`}
      >
        <span className="text-xs font-bold text-white">{rank}</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-muted-foreground">{rank}</span>
    </div>
  );
}

function Avatar({ initials, rank }: { initials: string; rank: number }) {
  const ring =
    rank === 1
      ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
      : rank === 2
        ? "ring-2 ring-zinc-300 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
        : rank === 3
          ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
          : "";

  return (
    <div
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 flex items-center justify-center ${ring} flex-shrink-0`}
    >
      <span className="text-xs sm:text-sm font-bold text-white">{initials}</span>
    </div>
  );
}

function XpBar({ xp }: { xp: number }) {
  // Изчисляваме прогреса към следващото ниво от общия XP
  const { currentXp, xpForNextLevel } = computeLevelFromXp(xp);
  const pct = Math.min((currentXp / xpForNextLevel) * 100, 100);
  return (
    <div className="w-16 sm:w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BadgeCount({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-xs text-muted-foreground/40">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <Award className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{count}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3">
        <Trophy className="h-7 w-7 text-zinc-400 dark:text-zinc-600" />
      </div>
      <p className="text-sm font-medium text-card-foreground">Няма участници</p>
      <p className="text-xs text-muted-foreground mt-1">Класацията ще се попълни скоро.</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 rounded-xl">
      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse flex-shrink-0" />
      <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-1.5 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="hidden md:block h-3.5 w-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
      <div className="h-4 w-14 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
    </div>
  );
}

function LeaderboardRow({
  user,
  rank,
  isCurrentUser,
}: {
  user: UserProfile;
  rank: number;
  isCurrentUser: boolean;
}) {
  // ПОПРАВКА: Изчисляваме нивото директно от XP вместо да ползваме
  // user.level от базата данни, което може да е остаряло/несинхронизирано.
  // Така нивото и XP лентата винаги ползват една и съща формула.
  const { level } = computeLevelFromXp(user.xp);

  const rawName = user.username ?? `Потребител ${user.id.slice(0, 4)}`;
  const name = rawName.length > 18 ? rawName.slice(0, 18) + "…" : rawName;
  const initials = rawName.slice(0, 1).toUpperCase();
  const isPodium = rank <= 3;
  const badgeCount = Array.isArray(user.badges) ? user.badges.length : 0;

  return (
    <div
      className={`group relative flex items-center gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 rounded-xl transition-all duration-300
        ${isCurrentUser
          ? "bg-green-500/10 border border-green-500/30 dark:border-green-500/20"
          : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-700/50"
        }
        ${isPodium && !isCurrentUser ? "hover:bg-amber-50/30 dark:hover:bg-amber-900/10" : ""}
      `}
    >
      {/* Място в класацията */}
      <div className="relative z-10 flex-shrink-0 w-8">
        <RankBadge rank={rank} />
      </div>

      {/* Аватар с инициали */}
      <div className="relative z-10">
        <Avatar initials={initials} rank={rank} />
        {rank === 1 && (
          <div className="absolute -top-1.5 -right-1.5 text-xs">👑</div>
        )}
      </div>

      {/* Име и XP лента с ниво */}
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm sm:text-base font-semibold truncate ${isCurrentUser ? "text-green-600 dark:text-green-400" : "text-card-foreground"}`}>
            {name}
          </p>
          {user.app_role === "platform_admin" && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 rounded-full">
              Админ
            </span>
          )}
          {user.organization_role === "org_admin" && (
            <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
          )}
          {isCurrentUser && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full">
              Ти
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {/* XpBar също ползва computeLevelFromXp вътрешно — синхронизирано */}
          <XpBar xp={user.xp} />
          {/* Показваме изчисленото ниво, не user.level от БД */}
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Ниво {level}
          </span>
        </div>
      </div>

      {/* Брой спечелени значки */}
      <div className="relative z-10 hidden md:flex items-center flex-shrink-0 w-16">
        <BadgeCount count={badgeCount} />
      </div>

      {/* Общи точки (XP) */}
      <div className="relative z-10 flex-shrink-0 text-right min-w-[60px] sm:min-w-[80px]">
        <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
          {user.xp.toLocaleString()}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Точки</p>
      </div>
    </div>
  );
}

export function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Зареждане на потребителите от Supabase, сортирани по XP низходящо
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, xp, level, trust_score, streak, badges, app_role, organization_id, organization_role, username")
        .order("xp", { ascending: false })
        .limit(50);

      if (!error && data) setUsers(data);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  // Сортираме отново от страна на клиента като предпазна мярка
  const sorted = [...users].sort((a, b) => b.xp - a.xp);

  return (
    <div className="relative w-full h-fit bg-white/70 dark:bg-zinc-900 backdrop-blur-xl dark:backdrop-blur-none rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-md hover:shadow-xl hover:border-green-500/30 transition-all duration-300 overflow-hidden">
      {/* Заглавна лента */}
      <div className="relative z-10 p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 sm:gap-3 text-card-foreground">
            <div className="p-1.5 sm:p-2 bg-yellow-400/20 rounded-lg">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-500" />
            </div>
            Класация
          </h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">
              {loading ? "…" : `${sorted.length} участника`}
            </span>
          </div>
        </div>

        {/* Заглавия на колони — показват се само при налични потребители */}
        {(loading || sorted.length > 0) && (
          <div className="mt-3 flex items-center gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-5">
            <div className="w-8 flex-shrink-0" />
            <div className="w-9 sm:w-10 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Потребител</span>
            </div>
            <div className="hidden md:block flex-shrink-0 w-16">
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Значки</span>
            </div>
            <div className="flex-shrink-0 min-w-[60px] sm:min-w-[80px] text-right">
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Точки</span>
            </div>
          </div>
        )}
      </div>

      {/* Редове с потребители */}
      <div className="relative z-10 p-2 sm:p-3 md:p-4 space-y-1">
        {loading ? (
          // Скелет при зареждане
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          // Празно състояние — няма потребители
          <EmptyState />
        ) : (
          // Редове с потребители
          sorted.map((user, i) => (
            <LeaderboardRow
              key={user.id}
              user={user}
              rank={i + 1}
              isCurrentUser={user.id === currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}