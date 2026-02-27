"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Gift, Sparkles, Lock, CheckCircle2, Zap, ShoppingBag,
  Leaf, Recycle, Star, X, Copy, Check, TrendingUp, AlertCircle,
} from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { createClient } from "@supabase/supabase-js";

interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: string;
  is_available: boolean;
  created_at: string;
}

interface UserProfile {
  xp: number;
  level: number;
  trust_score: number;
  streak: number;
}

// Supabase клиент
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Помощни функции
function fmt(n: number) {
  return new Intl.NumberFormat("bg-BG").format(n);
}

function computeLevelFromXp(totalXp: number) {
  let level = 1;
  let currentXp = totalXp;
  let xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  while (currentXp >= xpForNextLevel) {
    currentXp -= xpForNextLevel;
    level++;
    xpForNextLevel = Math.floor(100 * Math.pow(1.25, level - 1));
  }
  return { level, currentXp, xpForNextLevel };
}

const CATEGORY_LABELS: Record<string, string> = {
  merch: "Мърчандайз",
  entertainment: "Забавление",
  lifestyle: "Лайфстайл",
  health: "Здраве",
  food: "Храна",
  general: "Общи",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  merch: <Gift className="h-5 w-5" />,
  entertainment: <Star className="h-5 w-5" />,
  lifestyle: <Zap className="h-5 w-5" />,
  health: <Leaf className="h-5 w-5" />,
  food: <ShoppingBag className="h-5 w-5" />,
  general: <Gift className="h-5 w-5" />,
};

// Лента за напредък на XP
function XpProgressBar({ totalXp }: { totalXp: number }) {
  const { level, currentXp, xpForNextLevel } = computeLevelFromXp(totalXp);
  const pct = Math.min(100, (currentXp / xpForNextLevel) * 100);
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-400" />
          Ниво <strong className="text-white ml-1 text-base">{level}</strong>
        </span>
        <span className="text-sm">
          <strong className="text-green-400 text-base">{fmt(currentXp)}</strong> / {fmt(xpForNextLevel)} XP
        </span>
      </div>
      <div
        className="relative h-3 w-full rounded-full overflow-hidden bg-white/10"
        role="progressbar"
        aria-valuenow={currentXp}
        aria-valuemin={0}
        aria-valuemax={xpForNextLevel}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundImage: "linear-gradient(90deg,#4ade80,#22c55e,#059669)" }}
        />
      </div>
      <p className="text-center text-xs text-zinc-500">
        Още <strong className="text-zinc-300">{fmt(xpForNextLevel - currentXp)}</strong> XP до ниво {level + 1}
      </p>
    </div>
  );
}
function ClaimModal({ reward, code, onClose }: {
  reward: Reward;
  code: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { }
  }, [code]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 flex flex-col gap-6 shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="flex justify-center">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)", boxShadow: "0 0 20px rgba(74,222,128,.2)" }}
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Наградата е твоя!</h2>
          <p className="text-zinc-400 text-sm">
            Ето твоя уникален код за <span className="text-white font-medium">{reward.title}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-800 px-4 py-3">
          <code className="flex-1 font-mono text-sm text-green-400 tracking-widest select-all break-all">{code}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-zinc-300" />}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)" }}
        >
          Готово
        </button>
      </div>
    </div>
  );
}

// Карта на награда
function RewardCard({ reward, userXP, isClaiming, onClaim }: {
  reward: Reward;
  userXP: number;
  isClaiming: boolean;
  onClaim: (r: Reward) => void;
}) {
  const canAfford = userXP >= reward.points_cost;
  const deficit = reward.points_cost - userXP;

  return (
    <article className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 bg-zinc-900/60 backdrop-blur-md ${canAfford ? "border-white/10 hover:border-green-500/40 hover:-translate-y-0.5" : "border-white/5 opacity-50"
      }`}>
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage: canAfford
            ? "linear-gradient(90deg,transparent,#4ade80,#22c55e,transparent)"
            : "linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)"
        }}
      />
      <div className="flex flex-col flex-1 p-6 gap-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 text-white/90"
            style={{ backgroundImage: "linear-gradient(135deg,rgba(74,222,128,.15),rgba(16,185,129,.08))", border: "1px solid rgba(74,222,128,.15)" }}
          >
            {CATEGORY_ICONS[reward.category] ?? <Gift className="h-5 w-5" />}
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-white/10">
            <Sparkles className="h-3 w-3 text-green-400" />
            <span className="text-xs font-bold text-green-400">{fmt(reward.points_cost)} XP</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">{reward.title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{reward.description}</p>
        </div>
        <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-medium">
          {CATEGORY_LABELS[reward.category] ?? reward.category}
        </span>
        <button
          onClick={() => onClaim(reward)}
          disabled={!canAfford || isClaiming}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${canAfford
            ? "text-white hover:opacity-90 active:scale-[0.98]"
            : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
            }`}
          style={canAfford ? { backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)", boxShadow: "0 4px 12px rgba(34,197,94,.15)" } : {}}
        >
          {isClaiming ? (
            <><span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /><span>Обработване…</span></>
          ) : canAfford ? (
            <><Gift className="h-4 w-4" /><span>Вземи сега</span></>
          ) : (
            <><Lock className="h-4 w-4" /><span>Нужни са {fmt(deficit)} XP още</span></>
          )}
        </button>
      </div>
    </article>
  );
}

// Главна страница
export default function RewardsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ reward: Reward; code: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setDbError(null);
      try {
        // Вземи сесия от споделения клиент (чете от localStorage)
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUserId(session.user.id);

          // Зареди профил
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("xp, level, trust_score, streak")
            .eq("id", session.user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Profile error:", profileError);
          } else if (profile) {
            setUserProfile(profile);
          }
        }

        // Зареди награди
        const { data: rewardsData, error: rewardsError } = await supabase
          .from("rewards")
          .select("id, title, description, points_cost, category, is_available, created_at")
          .eq("is_available", true)
          .order("points_cost", { ascending: true });

        if (rewardsError) {
          console.error("Rewards error:", rewardsError);
          setDbError(`Грешка при зареждане на наградите: ${rewardsError.message}`);
        } else {
          setRewards(rewardsData ?? []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setDbError("Неочаквана грешка. Провери конзолата.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleClaim = useCallback(async (reward: Reward) => {
    if (!userProfile || userProfile.xp < reward.points_cost || claimingId || !userId) return;
    setClaimingId(reward.id);
    try {
      const newXp = userProfile.xp - reward.points_cost;
      const { level: newLevel } = computeLevelFromXp(newXp);

      const { error } = await supabase
        .from("user_profiles")
        .update({ xp: newXp, level: newLevel, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) { console.error("Claim error:", error); return; }

      const code = Math.random().toString(36).substring(2, 15).toUpperCase();
      setUserProfile(prev => prev ? { ...prev, xp: newXp, level: newLevel } : null);
      setModal({ reward, code });
    } catch (err) {
      console.error("Claim error:", err);
    } finally {
      setClaimingId(null);
    }
  }, [userProfile, claimingId, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalXp = userProfile?.xp ?? 0;
  const { level } = computeLevelFromXp(totalXp);

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-24">

        {/* Банер за грешка */}
        {dbError && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">{dbError}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Вероятно липсва RLS политика. Изпълни в Supabase SQL Editor:
              </p>
              <code className="block mt-2 text-xs text-green-400 bg-black/40 rounded-lg px-3 py-2 font-mono">
                CREATE POLICY "public read rewards" ON public.rewards FOR SELECT USING (is_available = true);
              </code>
            </div>
          </div>
        )}

        {/* Героична секция */}
        <div className="relative flex flex-col items-center text-center mb-16 px-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-72 opacity-15"
            style={{ background: "radial-gradient(ellipse at center,#4ade80 0%,#16a34a 40%,transparent 70%)", filter: "blur(80px)" }}
          />
          <div className="relative z-10 inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-green-500/30 bg-green-500/10 backdrop-blur-sm mb-6">
            <Sparkles className="h-4 w-4 text-green-400" />
            <span className="text-sm font-bold tracking-widest text-green-400 uppercase">{fmt(totalXp)} XP точки</span>
          </div>
          <h1 className="relative z-10 text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Магазин за{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#4ade80 0%,#22c55e 55%,#059669 100%)" }}>
              награди
            </span>
          </h1>
          <p className="relative z-10 max-w-md text-zinc-400 leading-relaxed mb-8">
            Обмени своите XP точки за продукти, ваучери и преживявания с по-малък отпечатък върху природата.
          </p>
          {userProfile && (
            <div className="relative z-10 w-full">
              <XpProgressBar totalXp={totalXp} />
            </div>
          )}
        </div>

        {/* Мрежа от награди */}
        <section aria-label="Награди">
          {rewards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rewards.map(reward => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userXP={totalXp}
                  isClaiming={claimingId === reward.id}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-20 gap-3">
              <Gift className="h-12 w-12 text-zinc-700" />
              <p className="text-zinc-400 font-medium">Все още няма добавени награди.</p>
              <p className="text-xs text-zinc-600 max-w-xs">
                Увери се, че таблицата rewards съдържа редове с <code className="text-zinc-400">is_available = true</code> и че има активна RLS политика за четене.
              </p>
            </div>
          )}
        </section>

        {/* Банер */}
        <div
          className="mt-14 rounded-2xl border border-white/5 overflow-hidden"
          style={{ backgroundImage: "linear-gradient(135deg,rgba(74,222,128,.15),rgba(16,185,129,.08),rgba(5,150,105,.15))" }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-zinc-900/90 backdrop-blur-md px-8 py-6">
            <div className="flex items-center gap-5">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 text-white"
                style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#059669)", boxShadow: "0 0 16px rgba(74,222,128,.18)" }}
              >
                <Recycle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-white">Искаш още XP?</p>
                <p className="text-sm text-zinc-400 mt-0.5">Завършвай дневните задачи и рециклирай редовно.</p>
              </div>
            </div>
            <a
              href="/app/tasks"
              className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)", boxShadow: "0 4px 12px rgba(34,197,94,.15)" }}
            >
              Към задачите
            </a>
          </div>
        </div>

      </main>
      {modal && <ClaimModal reward={modal.reward} code={modal.code} onClose={() => setModal(null)} />}
    </div>
  );
}