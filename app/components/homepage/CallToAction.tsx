import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CallToAction = () => {
  const { t } = useTranslation();

  return (
    <div className="relative py-20 px-4">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#00CD56]/10 via-emerald-400/8 to-[#00b849]/10 dark:from-[#00CD56]/5 dark:via-emerald-400/3 dark:to-[#00b849]/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-50 dark:to-zinc-200 bg-clip-text text-transparent mb-6">
          {t("cta.title")}
        </h2>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
          {t("cta.subtitle")}
        </p>
        <a
          href="/auth/register"
          className="group relative inline-block pl-12 pr-11 py-5 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white text-xl font-semibold rounded-2xl shadow-2xl shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[#00CD56]/50"
        >
          <span className="relative z-10 flex gap-3 items-center justify-items-center">
            {t("cta.button")} <ArrowRight />
          </span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </a>
      </div>
    </div>
  );
};

export default CallToAction;