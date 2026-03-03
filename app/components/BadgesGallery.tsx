"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Award, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export type Badge = {
  id: number;
  title?: string;
  description?: string;
  how_to_obtain?: string;
  category?: string;
  is_active: boolean;
  locked?: boolean;
  rarity?: "common" | "rare" | "epic" | "legendary";
};

type BadgesGalleryProps = {
  userId?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  aspectRatio?: "square" | "portrait" | "video";
  showNames?: boolean;
  showDescriptions?: boolean;
  showRarity?: boolean;
  showCategory?: boolean;
  className?: string;
  badgeClassName?: string;
  imageClassName?: string;
  onlyActive?: boolean;
  title?: string;
  description?: string;
};

const rarityConfig = {
  common: {
    gradient: "from-slate-400 to-slate-500",
    glow: "shadow-slate-400/30",
    ring: "ring-slate-400/40",
    label: "Обичайна",
    dot: "bg-slate-400",
  },
  rare: {
    gradient: "from-blue-400 to-blue-600",
    glow: "shadow-blue-400/30",
    ring: "ring-blue-400/40",
    label: "Рядка",
    dot: "bg-blue-400",
  },
  epic: {
    gradient: "from-purple-400 to-purple-600",
    glow: "shadow-purple-400/30",
    ring: "ring-purple-400/40",
    label: "Епична",
    dot: "bg-purple-400",
  },
  legendary: {
    gradient: "from-amber-400 to-amber-500",
    glow: "shadow-amber-400/40",
    ring: "ring-amber-400/50",
    label: "Легендарна",
    dot: "bg-amber-400",
  },
};

const aspectRatioClasses = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  video: "aspect-video",
};

export function BadgesGallery({
  userId: propUserId,
  columns = 4,
  aspectRatio = "square",
  showNames = true,
  showDescriptions = false,
  showRarity = true,
  showCategory = false,
  className,
  badgeClassName,
  imageClassName,
  onlyActive = true,
  title = "Значки",
  description = "Твоите постижения",
}: BadgesGalleryProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>();

  // получаване на userId
  useEffect(() => {
    const fetchUserId = async () => {
      if (propUserId) {
        setCurrentUserId(propUserId);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id);
      } catch {
        setCurrentUserId(undefined);
      }
    };
    fetchUserId();
  }, [propUserId]);

  // взимане на значките
  useEffect(() => {
    const fetchBadges = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (currentUserId) params.append("user_id", currentUserId);
        if (onlyActive) params.append("is_active", "true");

        const res = await fetch(`/api/badges?${params.toString()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) throw new Error(`Failed to fetch badges: ${res.status}`);
        const data: Badge[] = await res.json();
        setBadges(data);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Грешка при зареждане на значките");
        setBadges([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserId !== undefined) fetchBadges();
  }, [currentUserId, onlyActive]);

  const unlockedCount = badges.filter((b) => !b.locked).length;

  const gridColsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
  }[columns];

  return (
    <div
      className={cn(
        "group relative w-full h-fit backdrop-blur-xl",
        "bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90",
        "dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70",
        "rounded-xl border border-zinc-200/50 dark:border-zinc-800/50",
        "shadow-md hover:shadow-xl hover:border-green-500/30 transition-all duration-300 overflow-hidden",
        className,
      )}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* заглавие */}
      <div className="relative z-10 p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2 sm:gap-3 text-card-foreground">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-400/20 to-amber-500/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-amber-500" />
            </div>
            {title}
          </h3>

          {/* отключено */}
          {!isLoading && badges.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-xs font-medium text-muted-foreground">
                {unlockedCount}
                <span className="text-muted-foreground/50">/{badges.length}</span>
              </span>
            </div>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground pl-0.5">
            {description}
          </p>
        )}
      </div>

      {/* съдържание */}
      <div className="relative z-10 p-3 sm:p-4 md:p-6">
        {isLoading ? (
          <div className={cn("grid gap-3 sm:gap-4", gridColsClass)}>
            {Array.from({ length: columns * 2 }).map((_, i) => (
              <BadgeSkeleton key={i} aspectRatio={aspectRatio} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="p-3 rounded-full bg-red-500/10">
              <Award className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Award className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Все още няма значки</p>
          </div>
        ) : (
          <div className={cn("grid gap-3 sm:gap-4", gridColsClass)}>
            {badges.map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                aspectRatio={aspectRatio}
                showName={showNames}
                showDescription={showDescriptions}
                showRarity={showRarity}
                showCategory={showCategory}
                className={badgeClassName}
                imageClassName={imageClassName}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

type BadgeItemProps = {
  badge: Badge;
  aspectRatio: "square" | "portrait" | "video";
  showName: boolean;
  showDescription: boolean;
  showRarity: boolean;
  showCategory?: boolean;
  className?: string;
  imageClassName?: string;
};

function BadgeItem({
  badge,
  aspectRatio,
  showName,
  showDescription,
  showRarity,
  showCategory = false,
  className,
  imageClassName,
}: BadgeItemProps) {
  const isLocked = badge.locked;
  const rarity = badge.rarity ?? "common";
  const config = rarityConfig[rarity];
  const imageUrl = `/badges/badge-${badge.id}.png`;

  return (
    <div className={cn("group/badge relative", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl transition-all duration-300",
          "bg-gradient-to-br from-zinc-50/80 to-white/60 dark:from-zinc-800/60 dark:to-zinc-900/60",
          "border border-zinc-200/60 dark:border-zinc-700/40",
          aspectRatioClasses[aspectRatio],
          !isLocked && [
            "hover:shadow-lg hover:-translate-y-0.5",
          ],
          isLocked && "opacity-50 grayscale cursor-not-allowed",
        )}
      >
        {/* изображение */}
        <div className="relative h-full w-full overflow-hidden p-2">
          <Image
            src={imageUrl}
            alt={badge.title || `Значка ${badge.id}`}
            fill
            className={cn(
              "object-contain",
              imageClassName,
            )}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/badge-placeholder.svg";
            }}
          />
        </div>

        {/* иконка */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/20 rounded-xl">
            <div className="p-2 rounded-full bg-zinc-900/30 dark:bg-zinc-900/50 backdrop-blur-sm">
              <Lock className="h-4 w-4 text-white/70" />
            </div>
          </div>
        )}

        {/* указания */}
        {badge.how_to_obtain && (
          <div
            className={cn(
              "absolute inset-0 flex items-end justify-center rounded-xl",
              "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
              "opacity-0 group-hover/badge:opacity-100",
              "transition-opacity duration-300 p-2",
            )}
          >
            <p className="text-white text-[11px] text-center leading-snug line-clamp-4">
              {isLocked ? "🔒 " : "💡 "}
              {badge.how_to_obtain}
            </p>
          </div>
        )}

      </div>

      {/* описание под картината */}
      {(showName || showDescription || showCategory) && (
        <div className="mt-2 space-y-0.5 px-0.5">
          {showName && (
            <p className="text-xs sm:text-sm font-semibold text-center text-card-foreground line-clamp-1">
              {isLocked ? "???" : (badge.title ?? `Значка ${badge.id}`)}
            </p>
          )}
          {showCategory && badge.category && (
            <p className="text-[10px] text-muted-foreground text-center line-clamp-1">
              {badge.category}
            </p>
          )}
          {showDescription && badge.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 text-center">
              {badge.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// при зареждане
function BadgeSkeleton({
  aspectRatio,
}: {
  aspectRatio: "square" | "portrait" | "video";
}) {
  return (
    <div className="space-y-2 animate-pulse">
      <div
        className={cn(
          "w-full rounded-xl bg-zinc-100 dark:bg-zinc-800",
          aspectRatioClasses[aspectRatio],
        )}
      />
      <div className="h-3 w-3/4 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}