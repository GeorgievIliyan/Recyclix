"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Gift, Sparkles, Lock, CheckCircle2, Zap, ShoppingBag,
  Leaf, Recycle, Star, X, Copy, Check, TrendingUp, AlertCircle,
} from "lucide-react";
import { Navigation } from "@/app/components/ui/Navigation";
import { createClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { SimpleSpinningRecycling, SpinningRecyclingLoader } from "@/app/components/ui/RecyclingLoader";

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
function fmt(n: number, locale = "bg-BG") {
  return new Intl.NumberFormat(locale).format(n);
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
  const { t, i18n } = useTranslation();
  const { level, currentXp, xpForNextLevel } = computeLevelFromXp(totalXp);
  const pct = Math.min(100, (currentXp / xpForNextLevel) * 100);
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
          {t("rewards.progress.level", { level })}
        </span>
        <span className="text-sm">
          <strong className="text-green-600 dark:text-green-400 text-base">{fmt(currentXp, i18n.language)}</strong>
          <span className="text-zinc-400 dark:text-zinc-500"> / {fmt(xpForNextLevel, i18n.language)} {t("rewards.progress.xp")}</span>
        </span>
      </div>
      {/* Лента за прогрес */}
      <div
        className="relative h-3 w-full rounded-full overflow-hidden bg-zinc-200 dark:bg-white/10"
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
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        {t("rewards.progress.remaining", {
          remaining: fmt(xpForNextLevel - currentXp, i18n.language),
          nextLevel: level + 1,
        })}
      </p>
    </div>
  );
}

// Модален прозорец за взимане на награда
function ClaimModal({ reward, code, onClose }: {
  reward: Reward;
  code: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
      {/* Затъмнен фон */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 flex flex-col gap-6 shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        {/* Икона за успех */}
        <div className="flex justify-center">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)", boxShadow: "0 0 20px rgba(74,222,128,.2)" }}
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{t("rewards.claim.successTitle")}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {t("rewards.claim.message", { reward: reward.title })}
          </p>
        </div>
        {/* Код за копиране */}
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 px-4 py-3">
          <code className="flex-1 font-mono text-sm text-green-600 dark:text-green-400 tracking-widest select-all break-all">{code}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500 dark:text-green-400" /> : <Copy className="h-4 w-4 text-zinc-500 dark:text-zinc-300" />}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)" }}
        >
          {t("rewards.claim.done")}
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
  const { t, i18n } = useTranslation();
  const canAfford = userXP >= reward.points_cost;
  const deficit = reward.points_cost - userXP;

  return (
    <article className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300
      bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md
      ${canAfford
        ? "border-zinc-200 dark:border-white/10 hover:border-green-500/40 hover:-translate-y-0.5 shadow-sm hover:shadow-md dark:shadow-none"
        : "border-zinc-100 dark:border-white/5 opacity-50"
      }`}
    >
      {/* Горна декоративна линия */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage: canAfford
            ? "linear-gradient(90deg,transparent,#4ade80,#22c55e,transparent)"
            : "linear-gradient(90deg,transparent,rgba(0,0,0,.06),transparent)"
        }}
      />
      <div className="flex flex-col flex-1 p-6 gap-5">
        <div className="flex items-start justify-between gap-3">
          {/* Икона на категория */}
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 text-green-700 dark:text-white/90"
            style={{
              backgroundImage: "linear-gradient(135deg,rgba(74,222,128,.15),rgba(16,185,129,.08))",
              border: "1px solid rgba(74,222,128,.2)"
            }}
          >
            {CATEGORY_ICONS[reward.category] ?? <Gift className="h-5 w-5" />}
          </div>
          {/* Цена в XP */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10">
            <Sparkles className="h-3 w-3 text-green-500 dark:text-green-400" />
            <span className="text-xs font-bold text-green-600 dark:text-green-400">{fmt(reward.points_cost)} XP</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {reward.title}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{reward.description}</p>
        </div>
        {/* Категория */}
        <span className="text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-medium">
          {t(`rewards.categories.${reward.category}`, {
            defaultValue: CATEGORY_LABELS[reward.category] ?? reward.category,
          })}
        </span>
        {/* Бутон за взимане */}
        <button
          onClick={() => onClaim(reward)}
          disabled={!canAfford || isClaiming}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${canAfford
            ? "text-white hover:opacity-90 active:scale-[0.98]"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-white/5"
            }`}
          style={canAfford ? { backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)", boxShadow: "0 4px 12px rgba(34,197,94,.15)" } : {}}
        >
          {isClaiming ? (
            <><span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /><span>{t("rewards.card.claiming")}</span></>
          ) : canAfford ? (
            <><Gift className="h-4 w-4" /><span>{t("rewards.card.claimNow")}</span></>
          ) : (
            <><Lock className="h-4 w-4" /><span>{t("rewards.card.needsXp", { xp: fmt(deficit, i18n.language) })}</span></>
          )}
        </button>
      </div>
    </article>
  );
}

// Главна страница
export default function RewardsPage() {
  const { t, i18n } = useTranslation();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ reward: Reward; code: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // зареждане на данни от базата данни
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

  // Екран при зареждане
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black flex items-center justify-center">
        <SpinningRecyclingLoader />
      </div>
    );
  }

  const totalXp = userProfile?.xp ?? 0;
  const { level } = computeLevelFromXp(totalXp);

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-24">

        {/* Героична секция */}
        <div className="relative flex flex-col items-center text-center mb-16 px-4">
          {/* Декоративен градиент зад заглавието */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[150%] max-w-2xl h-72 opacity-10 dark:opacity-15"
            style={{
              background: "radial-gradient(ellipse at center,#4ade80 0%,#16a34a 40%,transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          {/* XP значка */}
          <div className="relative z-10 inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-green-500/30 bg-green-500/10 backdrop-blur-sm mb-6">
            <Sparkles className="h-4 w-4 text-green-500 dark:text-green-400" />
            <span className="text-sm font-bold tracking-widest text-green-600 dark:text-green-400 uppercase">
              {t("rewards.header.xpPoints", { xp: fmt(totalXp, i18n.language) })}
            </span>
          </div>
          <h1 className="relative z-10 text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">
            {t("rewards.heading.titlePrefix")}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#4ade80 0%,#22c55e 55%,#059669 100%)" }}>
              {t("rewards.heading.titleHighlight")}
            </span>
          </h1>
          <p className="relative z-10 max-w-md text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
            {t("rewards.heading.subtitle")}
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
            // Празно състояние
            <div className="flex flex-col items-center text-center py-20 gap-3">
              <Gift className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">{t("rewards.empty.title")}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-xs">
                {t("rewards.empty.description")} <code className="text-zinc-500 dark:text-zinc-400">is_available = true</code>.
              </p>
            </div>
          )}
        </section>

        {/* Промо банер */}
        <div
          className="mt-14 rounded-2xl border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm dark:shadow-none"
          style={{ backgroundImage: "linear-gradient(135deg,rgba(74,222,128,.08),rgba(16,185,129,.04),rgba(5,150,105,.08))" }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md px-8 py-6">
            <div className="flex items-center gap-5">
              {/* Икона за рециклиране */}
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 text-white"
                style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#059669)", boxShadow: "0 0 16px rgba(74,222,128,.18)" }}
              >
                <Recycle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">{t("rewards.promo.title")}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{t("rewards.promo.subtitle")}</p>
              </div>
            </div>
            <a
              href="/app/tasks"
              className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundImage: "linear-gradient(135deg,#4ade80,#22c55e,#059669)", boxShadow: "0 4px 12px rgba(34,197,94,.15)" }}
            >
              {t("rewards.promo.cta")}
            </a>
          </div>
        </div>

      </main>
      {modal && <ClaimModal reward={modal.reward} code={modal.code} onClose={() => setModal(null)} />}
    </div>
  );
}