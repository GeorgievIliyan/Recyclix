import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HeroProps {
  totalUsers: number;
  totalBins: number;
  totalKgRecycled: number;
}

const Hero = ({ totalUsers, totalBins, totalKgRecycled }: HeroProps) => {
  const { t } = useTranslation();

  return (
    <div
      id="hero"
      className="relative min-h-[85vh] flex items-center justify-center p-4 overflow-hidden lg:pt-16 pt-36"
    >
      <div
        className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-[#00CD56]/20 via-[#00b849]/15 to-transparent dark:from-[#00CD56]/10 dark:via-[#00b849]/8 dark:to-transparent rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-20 -right-32 w-96 h-96 bg-gradient-to-tl from-emerald-400/15 via-[#00CD56]/10 to-transparent dark:from-emerald-400/8 dark:via-[#00CD56]/5 dark:to-transparent rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "5s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#00CD56]/5 via-emerald-300/5 to-[#00b849]/5 dark:from-[#00CD56]/3 dark:via-emerald-300/3 dark:to-[#00b849]/3 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <div className="mb-6">
          <h1 className="text-5xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-50 dark:to-zinc-200 bg-clip-text text-transparent mb-4 leading-tight">
            {t("hero.title")}
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <a
            href="/auth/register"
            className="group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[#00CD56]/40"
          >
            <span className="relative z-10 flex gap-2 items-center justify-center">
              {t("hero.cta")} <ArrowRight />
            </span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
          <a
            href="/auth/login"
            className="group relative w-full sm:w-auto px-10 py-4 backdrop-blur-xl bg-gradient-to-br from-white/80 via-white/70 to-zinc-50/80 dark:from-zinc-900/40 dark:via-zinc-900/30 dark:to-zinc-800/40 border-2 border-zinc-300/50 dark:border-zinc-700/50 text-zinc-900 dark:text-white text-lg font-semibold rounded-2xl shadow-xl hover:border-[#00CD56]/50 dark:hover:border-[#00CD56]/50 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">{t("hero.login")}</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00CD56]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>

        <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#00CD56]/10 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full blur-2xl" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent mb-2">
                {totalUsers}
              </div>
              <div className="text-zinc-600 dark:text-zinc-500">
                {t("hero.stats.users")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent mb-2">
                {totalKgRecycled.toFixed(2)} {t("hero.stats.kg")}
              </div>
              <div className="text-zinc-600 dark:text-zinc-500">
                {t("hero.stats.recycled")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent mb-2">
                {totalBins}
              </div>
              <div className="text-zinc-600 dark:text-zinc-500">
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