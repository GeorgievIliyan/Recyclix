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
import { Recycle, Grid2x2X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPreferredLanguage } from "@/lib/utils";
import { RECYCLING_COLORS } from "@/app/components/map-ui/MapComponent";

// типизация
interface MaterialData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any;
}

interface MaterialDefinition {
  translationKey: string;
  colorKey: keyof typeof RECYCLING_COLORS;
  aliases: string[];
}

const MATERIAL_DEFINITIONS: Record<string, MaterialDefinition> = {
  glass: {
    translationKey: "gamification.recentActivity.materials.glass",
    colorKey: "glass",
    aliases: ["glass", "стъкло", "glas", "vidrio", "verre"],
  },
  plastic: {
    translationKey: "gamification.recentActivity.materials.plastic",
    colorKey: "plastic",
    aliases: ["plastic", "пластмаса", "kunststoff", "plastico", "plástico", "plastique"],
  },
  paper: {
    translationKey: "gamification.recentActivity.materials.paper",
    colorKey: "paper",
    aliases: ["paper", "хартия", "papier", "papel", "papier"],
  },
  cardboard: {
    translationKey: "gamification.recentActivity.materials.cardboard",
    colorKey: "cardboard",
    aliases: ["cardboard", "картон", "karton", "carton", "cartón", "carton"],
  },
  metal: {
    translationKey: "gamification.recentActivity.materials.metal",
    colorKey: "metal",
    aliases: [
      "metal",
      "метал",
      "алуминий",
      "metall",
      "organisch",
      "vidrio",
      "métal",
      "aluminum",
      "aluminium",
    ],
  },
  organic: {
    translationKey: "gamification.recentActivity.materials.organic",
    colorKey: "organic",
    aliases: [
      "organic",
      "органични",
      "органични отпадъци",
      "organisch",
      "organico",
      "orgánico",
      "organique",
    ],
  },
  electronics: {
    translationKey: "gamification.recentActivity.materials.electronics",
    colorKey: "electronics",
    aliases: [
      "electronics",
      "электроника",
      "elektronik",
      "electronica",
      "electrónica",
      "électronique",
      "electronique",
    ],
  },
  textiles: {
    translationKey: "gamification.recentActivity.materials.textiles",
    colorKey: "textiles",
    aliases: ["textiles", "текстил", "дрехи", "обувки", "textilien", "clothing", "clothes"],
  },
  general: {
    translationKey: "gamification.recentActivity.materials.general",
    colorKey: "general",
    aliases: ["general", "общи отпадъци", "allgemein", "residuos", "général", "general", "waste"],
  },
  batteries: {
    translationKey: "gamification.recentActivity.materials.batteries",
    colorKey: "batteries",
    aliases: ["batteries", "батерии", "batterien", "baterias", "baterías", "piles", "pile"],
  },
  compost: {
    translationKey: "gamification.recentActivity.materials.compost",
    colorKey: "compost",
    aliases: ["compost", "компост", "kompost"],
  },
  bio_waste: {
    translationKey: "gamification.recentActivity.materials.bio_waste",
    colorKey: "bio_waste",
    aliases: ["bio_waste", "биоотпадъци", "biomuell", "biomüll"],
  },
  residual: {
    translationKey: "gamification.recentActivity.materials.residual",
    colorKey: "residual",
    aliases: [
      "residual",
      "остатъчни отпадъци",
      "restmuell",
      "restmüll",
      "résiduels",
      "residuel",
    ],
  },
  other: {
    translationKey: "gamification.recentActivity.materials.other",
    colorKey: "unknown",
    aliases: ["other", "други", "sonstiges", "otro", "autre", "trash"],
  },
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

const getMaterialDefinition = (materialName: string): MaterialDefinition | null => {
  if (!materialName) return null;

  const normalized = materialName.toLowerCase().trim();

  // при точен съответствие
  for (const definition of Object.values(MATERIAL_DEFINITIONS)) {
    if (definition.aliases.includes(normalized)) {
      return definition;
    }
  }

  // при частично съответствие
  for (const definition of Object.values(MATERIAL_DEFINITIONS)) {
    if (definition.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
      return definition;
    }
  }

  return null;
};

// помощни фунцкии за извличане на превод и цвят
const getMaterialTranslationKey = (materialName: string): string => {
  const definition = getMaterialDefinition(materialName);
  return definition?.translationKey || "";
};

const getMaterialHexColor = (materialName: string): string => {
  const definition = getMaterialDefinition(materialName);

  if (!definition) {
    return gradientToHex[RECYCLING_COLORS.unknown];
  }

  const gradientClass = RECYCLING_COLORS[definition.colorKey];
  return gradientToHex[gradientClass] || gradientToHex[RECYCLING_COLORS.unknown];
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

      const displayName = translationKey
        ? t(translationKey, { defaultValue: originalName })
        : originalName;

      const hexColor = getMaterialHexColor(originalName);

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
          <div className="h-[260px] flex flex-col items-center justify-center gap-4">
            <Grid2x2X className="text-neutral-300 dark:text-neutral-600 w-14 h-14" />
            <p className="text-neutral-300 dark:text-neutral-600 text-xs sm:text-sm">
              {t("gamification.materialsBreakdown.noData", { defaultValue: "No data" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}