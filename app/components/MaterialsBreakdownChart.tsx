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
import { RECYCLING_COLORS } from "@/app/components/MapComponent";

interface MaterialData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any;
}

const materialMap: Record<string, string> = {
  glass: "Стъкло",
  plastic: "Пластмаса",
  paper: "Хартия",
  metal: "Метал",
  organic: "Органични отпадъци",
  other: "Други",
  textiles: "Текстил",
  electronics: "Електроника",
  batteries: "Батерии",
  cardboard: "Картон",
  compost: "Компост",
  general: "Общи отпадъци",
  residual: "Остатъчни отпадъци",
  bio_waste: "Биоотпадъци",
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
  const hasData = data && data.length > 0;

  const translatedData = useMemo(() => {
    if (!hasData) return [];

    return data.map((item) => {
      const originalName = item.name?.trim() || "";
      const normalizedKey = originalName.toLowerCase();

      let displayName = materialMap[normalizedKey] || originalName;

      const isBulgarian = Object.values(materialMap).some(
        (bgName) => bgName.toLowerCase() === normalizedKey,
      );
      if (isBulgarian) {
        displayName = originalName;
      }

      const hexColor =
        getMaterialHexColor(displayName) || getMaterialHexColor(originalName);

      return {
        ...item,
        name: displayName,
        originalName: originalName,
        fill: hexColor,
      };
    });
  }, [data, hasData]);

  return (
    <div className="group relative bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-neutral-900/70 dark:via-neutral-900/60 dark:to-neutral-800/70 rounded-xl border border-border dark:border-neutral-700 shadow-md overflow-hidden hover:shadow-lg hover:border-green-500/30 dark:hover:border-green-500/30 transition-all duration-300">
      {/* Деликатен градиентен акцент */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 p-4 sm:p-6 border-b border-border dark:border-neutral-700 flex flex-row gap-3 items-center justify-items-center">
        <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
          <Recycle className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-white">
            Рециклирани материали
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground dark:text-neutral-400">
            Разпределени по тип
          </p>
        </div>
      </div>
      <div className="relative z-10 p-4 sm:p-6">
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
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground dark:text-gray-400 text-sm">
              Няма данни
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
