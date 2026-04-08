import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";

interface HeroProps {
  totalUsers: number;
  totalBins: number;
  totalKgRecycled: number;
}

const Hero = ({ totalUsers, totalBins, totalKgRecycled }: HeroProps) => {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      id="hero"
      ref={heroRef}
      className="relative flex flex-col items-center justify-center overflow-hidden lg:pt-20 pt-32 pb-0"
      style={{ minHeight: "90vh" }}
    >
      {/* Фонова текстура с шум */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* Фина мрежа */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-color, #000) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color, #000) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Горно централно сияние */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-20 dark:opacity-10 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, #00CD56 0%, #00b849 40%, transparent 70%)",
        }}
      />

      {/* Ляво сияние */}
      <div
        className="pointer-events-none absolute top-1/3 -left-64 w-[500px] h-[500px] rounded-full opacity-10 dark:opacity-5 blur-3xl"
        style={{ background: "#00CD56" }}
      />

      {/* Дясно сияние */}
      <div
        className="pointer-events-none absolute top-1/3 -right-64 w-[500px] h-[500px] rounded-full opacity-10 dark:opacity-5 blur-3xl"
        style={{ background: "#00b849" }}
      />

      {/* Основно съдържание */}
      <div className="relative z-10 max-w-5xl mx-auto text-center px-6 w-full">

        {/* Заглавие — само тук се използва serif шрифт */}
        <h1
          className="font-bold leading-[1.05] tracking-tight mb-6"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          <span className="block text-5xl md:text-6xl lg:text-7xl text-zinc-900 dark:text-white">
            {t("hero.heading.line1")}
          </span>
          <span className="block text-5xl md:text-6xl lg:text-7xl text-zinc-900 dark:text-white">
            {t("hero.heading.line2")}
          </span>
          <span
            className="block text-5xl md:text-6xl lg:text-7xl"
            style={{
              background:
                "linear-gradient(135deg, #00CD56 0%, #00e563 30%, #00b849 60%, #009e3d 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("hero.heading.line3")}
          </span>
        </h1>

        {/* Подзаглавие */}
        <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("hero.subtitle")}
        </p>

        {/* Бутони за действие */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14">
          <a href="/auth/register" className="group relative w-full sm:w-auto">
            {/* Сияещ ореол около основния бутон */}
            <div
              className="absolute -inset-0.5 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
              style={{
                background: "linear-gradient(135deg, #00CD56, #00e563, #00b849)",
              }}
            />
            <span
              className="relative flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-white font-semibold text-base transition-all duration-200 group-hover:gap-3.5"
              style={{
                background: "linear-gradient(135deg, #00CD56 0%, #00b849 100%)",
              }}
            >
              {t("hero.cta")}
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </a>

          {/* Вторичен бутон за вход */}
          <a
            href="/auth/login"
            className="group w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm text-zinc-700 dark:text-zinc-300 font-semibold text-base hover:border-[#00CD56]/50 hover:text-zinc-900 dark:hover:text-white transition-all duration-200"
          >
            {t("hero.login")}
          </a>
        </div>

        {/* Лента със статистики */}
        <div
          className="relative rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-6 mb-0 overflow-hidden"
          style={{
            boxShadow:
              "0 4px 40px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset",
          }}
        >
          {/* Горна акцентна линия в цвят на марката */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 opacity-60"
            style={{
              background:
                "linear-gradient(90deg, transparent, #00CD56, transparent)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800">
            {/* Статистика: Активни потребители */}
            <div className="text-center md:pr-6 pt-4 md:pt-0 first:pt-0">
              <div
                className="text-3xl font-bold mb-1 tabular-nums"
                style={{
                  background:
                    "linear-gradient(135deg, #00CD56 0%, #009e3d 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {totalUsers.toLocaleString()}
              </div>
              <div className="text-xs font-medium tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                {t("hero.stats.users")}
              </div>
            </div>

            {/* Статистика: Рециклирани материали */}
            <div className="text-center md:px-6 pt-4 md:pt-0">
              <div
                className="text-3xl font-bold mb-1 tabular-nums"
                style={{
                  background:
                    "linear-gradient(135deg, #00CD56 0%, #009e3d 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {totalKgRecycled.toFixed(2)}{" "}
                <span className="text-2xl">{t("hero.stats.kg")}</span>
              </div>
              <div className="text-xs font-medium tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                {t("hero.stats.recycled")}
              </div>
            </div>

            {/* Статистика: Пунктове за рециклиране */}
            <div className="text-center md:pl-6 pt-4 md:pt-0">
              <div
                className="text-3xl font-bold mb-1 tabular-nums"
                style={{
                  background:
                    "linear-gradient(135deg, #00CD56 0%, #009e3d 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {totalBins.toLocaleString()}
              </div>
              <div className="text-xs font-medium tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                {t("hero.stats.bins")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;