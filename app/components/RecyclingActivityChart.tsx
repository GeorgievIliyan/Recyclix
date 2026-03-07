"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import colors from "tailwindcss/colors";
import { Zap } from "lucide-react";
import { useEffect, useState, useId } from "react";

interface ActivityData {
  date: string;
  items: number;
}

interface RecyclingActivityChartProps {
  data: ActivityData[];
}

export function RecyclingActivityChart({ data }: RecyclingActivityChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const barGradientId = useId();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const filledData = Array.from({ length: 3 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (2 - i));
    const dateString = d.toLocaleDateString("bg-BG", {
      day: "numeric",
      month: "short",
    });
    const existingDay = data?.find((d) => d.date === dateString);
    return { date: dateString, items: existingDay ? existingDay.items : 0 };
  });

  return (
    <div className="group relative transform-gpu bg-white/70 dark:bg-zinc-900 backdrop-blur-xl dark:backdrop-blur-none rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-md overflow-hidden hover:shadow-lg hover:border-green-500/30 transition-all duration-300">
      <div className="relative z-10 p-3 sm:p-4 md:p-6 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-row gap-2 sm:gap-3 items-center">
        <div className="p-1.5 sm:p-2 bg-yellow-400/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
          <Zap className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-foreground dark:text-neutral-100">
            Активност
          </h3>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground dark:text-neutral-400">
            Последните 3 дни
          </p>
        </div>
      </div>

      <div className="relative z-10 p-3 sm:p-4 md:p-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={filledData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.green[400]} />
                <stop offset="100%" stopColor={colors.emerald[600]} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke={isDarkMode ? "#3f3f46" : colors.zinc[200]}
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              stroke={colors.zinc[500]}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              dy={10}
            />

            <YAxis
              stroke={colors.zinc[500]}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              allowDecimals={false}
              domain={[0, "dataMax"]}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#18181b" : colors.white,
                border: isDarkMode
                  ? "1px solid #3f3f46"
                  : `1px solid ${colors.zinc[200]}`,
                borderRadius: "12px",
                fontSize: "12px",
              }}
              labelStyle={{
                color: isDarkMode ? colors.white : colors.zinc[900],
                fontWeight: "bold",
              }}
              itemStyle={{ color: colors.green[500] }}
              cursor={{
                fill: isDarkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(34,197,94,0.03)",
              }}
            />

            <Bar
              dataKey="items"
              name="боклука"
              fill={`url(#${barGradientId})`}
              radius={[6, 6, 0, 0]}
              maxBarSize={50}
              minPointSize={5}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
