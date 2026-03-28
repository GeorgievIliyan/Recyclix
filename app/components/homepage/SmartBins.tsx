import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

const SmartBins = () => {
  const { t } = useTranslation();

  const features = [
    t("smartBins.features.0"),
    t("smartBins.features.1"),
    t("smartBins.features.2"),
    t("smartBins.features.3"),
  ];

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      id="smart-bins"
      className="relative py-20 px-4 bg-gradient-to-b from-transparent via-zinc-100/50 to-transparent dark:via-zinc-900/20"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-[#00CD56]/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tl from-emerald-400/20 to-transparent rounded-full blur-3xl" />
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl overflow-hidden">
              <img
                src="/assets/smart_bin.png"
                alt={t("smartBins.imageAlt")}
                className="w-full h-auto rounded-2xl"
              />
            </div>
          </div>
          <div>
            <h2 className="text-4xl md:text-6xl font-meduim bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-6">
              <span className="text-green-400 to text-emerald-600 font-semibold">
                Smart
              </span>{" "}
              {t("smartBins.title")}
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {t("smartBins.desc")}
            </p>
            <ul className="space-y-4">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#00CD56] to-[#00b849] rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartBins;