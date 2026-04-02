"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Recycle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPreferredLanguage } from "@/lib/utils";
import { RECYCLING_COLORS } from "@/app/components/map-ui/MapComponent";

interface MaterialData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any;
}

const getMaterialTranslationKey = (materialName: string): string => {
  const normalized = materialName.toLowerCase().trim();
  
  // Съпоставяне на често срещани имена на материали с ключове за превод (поддържа и многобройни локални варианти)
  const materialKeyMap: Record<string, string> = {
    glass: "gamification.recentActivity.materials.glass",
    plastic: "gamification.recentActivity.materials.plastic",
    paper: "gamification.recentActivity.materials.paper",
    metal: "gamification.recentActivity.materials.metal",
    organic: "gamification.recentActivity.materials.organic",
    electronics: "gamification.recentActivity.materials.electronics",
    textiles: "gamification.recentActivity.materials.textiles",
    general: "gamification.recentActivity.materials.general",
    cardboard: "gamification.recentActivity.materials.cardboard",
    batteries: "gamification.recentActivity.materials.batteries",
    compost: "gamification.recentActivity.materials.compost",
    residual: "gamification.recentActivity.materials.residual",
    bio_waste: "gamification.recentActivity.materials.bio_waste",
    other: "gamification.recentActivity.materials.other",

    // Български
    стъкло: "gamification.recentActivity.materials.glass",
    пластмаса: "gamification.recentActivity.materials.plastic",
    хартия: "gamification.recentActivity.materials.paper",
    картон: "gamification.recentActivity.materials.cardboard",
    метал: "gamification.recentActivity.materials.metal",
    алуминий: "gamification.recentActivity.materials.metal",
    органични: "gamification.recentActivity.materials.organic",
    "органични отпадъци": "gamification.recentActivity.materials.organic",
    биоотпадъци: "gamification.recentActivity.materials.bio_waste",
    компост: "gamification.recentActivity.materials.compost",
    електроника: "gamification.recentActivity.materials.electronics",
    батерии: "gamification.recentActivity.materials.batteries",
    текстил: "gamification.recentActivity.materials.textiles",
    дрехи: "gamification.recentActivity.materials.textiles",
    обувки: "gamification.recentActivity.materials.textiles",
    "общи отпадъци": "gamification.recentActivity.materials.general",
    "остатъчни отпадъци": "gamification.recentActivity.materials.residual",
    други: "gamification.recentActivity.materials.other",

    // Немски
    glas: "gamification.recentActivity.materials.glass",
    kunststoff: "gamification.recentActivity.materials.plastic",
    papier: "gamification.recentActivity.materials.paper",
    metall: "gamification.recentActivity.materials.metal",
    organisch: "gamification.recentActivity.materials.organic",
    elektronik: "gamification.recentActivity.materials.electronics",
    textilien: "gamification.recentActivity.materials.textiles",
    allgemein: "gamification.recentActivity.materials.general",
    karton: "gamification.recentActivity.materials.cardboard",
    batterien: "gamification.recentActivity.materials.batteries",
    kompost: "gamification.recentActivity.materials.compost",
    restmuell: "gamification.recentActivity.materials.residual",
    "restmüll": "gamification.recentActivity.materials.residual",
    biomuell: "gamification.recentActivity.materials.bio_waste",
    "biomüll": "gamification.recentActivity.materials.bio_waste",
    sonstiges: "gamification.recentActivity.materials.other",

    // Испански
    vidrio: "gamification.recentActivity.materials.glass",
    plastico: "gamification.recentActivity.materials.plastic",
    plástico: "gamification.recentActivity.materials.plastic",
    papel: "gamification.recentActivity.materials.paper",
    metal: "gamification.recentActivity.materials.metal",
    organico: "gamification.recentActivity.materials.organic",
    orgánico: "gamification.recentActivity.materials.organic",
    electronica: "gamification.recentActivity.materials.electronics",
    electrónica: "gamification.recentActivity.materials.electronics",
    textiles: "gamification.recentActivity.materials.textiles",
    general: "gamification.recentActivity.materials.general",
    carton: "gamification.recentActivity.materials.cardboard",
    cartón: "gamification.recentActivity.materials.cardboard",
    baterias: "gamification.recentActivity.materials.batteries",
    baterías: "gamification.recentActivity.materials.batteries",
    compost: "gamification.recentActivity.materials.compost",
    residual: "gamification.recentActivity.materials.residual",
    residuos: "gamification.recentActivity.materials.general",
    otro: "gamification.recentActivity.materials.other",

    // Френски
    verre: "gamification.recentActivity.materials.glass",
    plastique: "gamification.recentActivity.materials.plastic",
    papier: "gamification.recentActivity.materials.paper",
    métal: "gamification.recentActivity.materials.metal",
    metal: "gamification.recentActivity.materials.metal",
    organique: "gamification.recentActivity.materials.organic",
    électronique: "gamification.recentActivity.materials.electronics",
    electronique: "gamification.recentActivity.materials.electronics",
    textiles: "gamification.recentActivity.materials.textiles",
    général: "gamification.recentActivity.materials.general",
    general: "gamification.recentActivity.materials.general",
    carton: "gamification.recentActivity.materials.cardboard",
    piles: "gamification.recentActivity.materials.batteries",
    compost: "gamification.recentActivity.materials.compost",
    résiduels: "gamification.recentActivity.materials.residual",
    residuel: "gamification.recentActivity.materials.residual",
    autre: "gamification.recentActivity.materials.other",
  };
  
  return materialKeyMap[normalized] || "";
};

const getMaterialCodeFromKey = (translationKey: string): string => {
  if (!translationKey) return "";
  // Премахва общия преводен път до най-вътрешния ключ на материала
  const parts = translationKey.split(".");
  return parts[parts.length - 1] || "";
};

const gradientToHex: Record<string, string> = {
  "bg-gradient-to-r from-blue-400 to-blue-500": "#3B82F6",
  "bg-gradient-to-r from-yellow-400 to-yellow-500": "#EAB308",
  "bg-gradient-to-r from-green-400 to-green-500": "#10B981",
  "bg-gradient-to-r from-emerald-400 to-emerald-500": "#10B981",
  "bg-gradient-to-r from-gray-400 to-gray-500": "#6B7280",
  "bg-gradient-to-r from-amber-400 to-amber-500": "#F59E0B",
  "bg-gradient-to-r from-purple-400 to-purple-500": "#8B5CF6",
  "bg-gradient-to-r from-orange-400 to-orange-500": "#F97316",
  "bg-gradient-to-r from-pink-400 to-pink-500": "#EC4899",
  "bg-gradient-to-r from-red-400 to-red-500": "#EF4444",
  "bg-gradient-to-r from-indigo-400 to-indigo-500": "#6366F1",
  "bg-gradient-to-r from-cyan-400 to-cyan-500": "#06B6D4",
  "bg-gradient-to-r from-slate-400 to-slate-500": "#64748B",
};

const materialColorMap: Record<string, keyof typeof RECYCLING_COLORS> = {
  glass: "glass",
  plastic: "plastic",
  paper: "paper",
  cardboard: "cardboard",
  metal: "metal",
  aluminum: "metal",
  aluminium: "metal",
  organic: "organic",
  bio_waste: "bio_waste",
  compost: "compost",
  electronics: "electronics",
  batteries: "batteries",
  textiles: "textiles",
  clothing: "clothing",
  clothes: "textiles",
  general: "general",
  residual: "residual",
  waste: "general",
  trash: "general",
  other: "unknown",

  // Български варианти
  стъкло: "glass",
  пластмаса: "plastic",
  хартия: "paper",
  картон: "cardboard",
  метал: "metal",
  алуминий: "metal",
  органични: "organic",
  "органични отпадъци": "organic",
  биоотпадъци: "bio_waste",
  компост: "compost",
  електроника: "electronics",
  батерии: "batteries",
  текстил: "textiles",
  дрехи: "textiles",
  обувки: "textiles",
  "общи отпадъци": "general",
  "остатъчни отпадъци": "residual",
  други: "unknown",

  // Немски варианти
  glas: "glass",
  kunststoff: "plastic",
  papier: "paper",
  metall: "metal",
  organisch: "organic",
  elektronik: "electronics",
  textilien: "textiles",
  allgemein: "general",
  karton: "cardboard",
  batterien: "batteries",
  kompost: "compost",
  restmuell: "residual",
  "restmüll": "residual",
  biomuell: "bio_waste",
  "biomüll": "bio_waste",
  sonstiges: "unknown",

  // Испански варианти
  vidrio: "glass",
  plastico: "plastic",
  plástico: "plastic",
  papel: "paper",
  organico: "organic",
  orgánico: "organic",
  electronica: "electronics",
  electrónica: "electronics",
  general: "general",
  cartón: "cardboard",
  carton: "cardboard",
  baterias: "batteries",
  baterías: "batteries",
  residuos: "general",
  otro: "unknown",

  // Френски варианти
  verre: "glass",
  plastique: "plastic",
  métal: "metal",
  metal: "metal",
  organique: "organic",
  électronique: "electronics",
  electronique: "electronics",
  général: "general",
  pile: "batteries",
  piles: "batteries",
  résiduels: "residual",
  residuel: "residual",
  autre: "unknown",
};

const getMaterialHexColor = (materialName: string): string => {
  if (!materialName) return gradientToHex[RECYCLING_COLORS.unknown];

  const normalized = materialName.toLowerCase().trim();

  const colorKey = materialColorMap[normalized];
  if (colorKey && RECYCLING_COLORS[colorKey]) {
    const gradientClass = RECYCLING_COLORS[colorKey];
    return (
      gradientToHex[gradientClass] || gradientToHex[RECYCLING_COLORS.unknown]
    );
  }

  for (const [key, colorMapKey] of Object.entries(materialColorMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      const gradientClass = RECYCLING_COLORS[colorMapKey];
      if (gradientClass) {
        return (
          gradientToHex[gradientClass] ||
          gradientToHex[RECYCLING_COLORS.unknown]
        );
      }
    }
  }

  if (normalized.includes("стъкло") || normalized.includes("glass")) {
    return gradientToHex[RECYCLING_COLORS.glass];
  } else if (
    normalized.includes("пластмаса") ||
    normalized.includes("plastic")
  ) {
    return gradientToHex[RECYCLING_COLORS.plastic];
  } else if (
    normalized.includes("хартия") ||
    normalized.includes("paper") ||
    normalized.includes("картон")
  ) {
    return gradientToHex[RECYCLING_COLORS.paper];
  } else if (
    normalized.includes("метал") ||
    normalized.includes("metal") ||
    normalized.includes("алуминий")
  ) {
    return gradientToHex[RECYCLING_COLORS.metal];
  } else if (
    normalized.includes("органич") ||
    normalized.includes("organic") ||
    normalized.includes("био") ||
    normalized.includes("компост")
  ) {
    return gradientToHex[RECYCLING_COLORS.organic];
  } else if (
    normalized.includes("електро") ||
    normalized.includes("electron")
  ) {
    return gradientToHex[RECYCLING_COLORS.electronics];
  } else if (normalized.includes("батери") || normalized.includes("batter")) {
    return gradientToHex[RECYCLING_COLORS.batteries];
  } else if (
    normalized.includes("текстил") ||
    normalized.includes("textile") ||
    normalized.includes("дрехи") ||
    normalized.includes("clothes")
  ) {
    return gradientToHex[RECYCLING_COLORS.textiles];
  } else if (
    normalized.includes("общи") ||
    normalized.includes("general") ||
    normalized.includes("waste")
  ) {
    return gradientToHex[RECYCLING_COLORS.general];
  }

  return gradientToHex[RECYCLING_COLORS.unknown];
};

interface MaterialsBreakdownChartProps {
  data: MaterialData[];
}

export function MaterialsBreakdownChart({
  data,
}: MaterialsBreakdownChartProps) {
  const { t, i18n } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const hasData = data && data.length > 0;

  useEffect(() => {
    const preferredLang = getPreferredLanguage();
    if (i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang);
    }
    document.documentElement.lang = preferredLang;
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translatedData = useMemo(() => {
    if (!hasData || !mounted) return [];

    return data.map((item) => {
      const originalName = item.name?.trim() || "";
      const translationKey = getMaterialTranslationKey(originalName);
      const materialCode = translationKey
        ? getMaterialCodeFromKey(translationKey)
        : originalName.toLowerCase();

      const displayName = translationKey
        ? t(translationKey, { defaultValue: originalName })
        : originalName;

      const hexColor =
        getMaterialHexColor(materialCode) ||
        getMaterialHexColor(originalName) ||
        getMaterialHexColor(displayName);

      return {
        ...item,
        name: displayName,
        originalName: originalName,
        fill: hexColor,
      };
    });
  }, [data, hasData, mounted, t]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="group relative transform-gpu bg-white/70 dark:bg-zinc-900 backdrop-blur-xl dark:backdrop-blur-none rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-md overflow-hidden hover:shadow-lg hover:border-green-500/30 transition-all duration-300">
      <div className="relative z-10 p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-row gap-2 sm:gap-3 items-center justify-items-center">
        <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
          <Recycle className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground dark:text-neutral-100">
            {t("gamification.materialsBreakdown.title", { defaultValue: "Recycled materials" })}
          </h3>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground dark:text-neutral-400">
            {t("gamification.materialsBreakdown.subtitle", { defaultValue: "Distributed by type" })}
          </p>
        </div>
      </div>
      <div className="relative z-10 p-3 sm:p-4 md:p-6">
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={translatedData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
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
                    style={{ outline: "none" }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                }}
                formatter={(
                  value: number | string | undefined,
                  name: string | undefined,
                ) => [value ?? 0, name ?? ""]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center">
            <p className="text-muted-foreground dark:text-gray-400 text-xs sm:text-sm">
              {t("gamification.materialsBreakdown.noData", { defaultValue: "No data" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}