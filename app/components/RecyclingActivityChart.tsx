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
      day: "2-digit",
      month: "2-digit",
    });
    const existingDay = data?.find((d) => d.date === dateString);
    return { date: dateString, items: existingDay ? existingDay.items : 0 };
  });

  return (
    <div className="group relative transform-gpu bg-white dark:bg-neutral-900 bg-gradient-to-br from-white to-zinc-50 dark:from-[#171717] dark:to-[#262626] rounded-xl border border-border dark:border-neutral-700/50 shadow-md overflow-hidden hover:shadow-lg hover:border-green-500/30 transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10 p-4 sm:p-6 border-b border-border dark:border-neutral-700/50 flex flex-row gap-3 items-center">
        <div className="p-2 bg-yellow-400/10 dark:bg-yellow-400/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
          <Zap className="h-8 w-8 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground dark:text-neutral-100">
            Активност
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground dark:text-neutral-400">
            Последните 3 дни
          </p>
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={filledData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.green[400]} />
                <stop offset="100%" stopColor={colors.emerald[600]} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke={isDarkMode ? "#262626" : colors.zinc[200]}
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
            />

            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? "#171717" : colors.white,
                border: isDarkMode
                  ? "1px solid #262626"
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
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
