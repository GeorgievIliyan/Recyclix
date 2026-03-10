import { Check, Zap, Sparkles } from "lucide-react";

const Pricing = () => {
  return (
    <div id="pricing" className="relative py-20 px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#00CD56]/10 via-emerald-400/8 to-[#00b849]/10 dark:from-[#00CD56]/5 dark:via-emerald-400/3 dark:to-[#00b849]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4">
            Изберете вашия план
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Перфектният план за вашето интелигентно рециклиране
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Начален план */}
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col">
            <div className="mb-4">
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
                Начален
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                За малкия бизнес
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                  19.99 €
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">/месец</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "До 100 кг рециклиране месечно",
                "Основна статистика и отчети",
                "Базово админстративно табло",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#00CD56] flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/app/request-access"
              className="mt-auto block w-full py-3 px-6 text-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Изберете план
            </a>
          </div>

          {/* Популярен план */}
          <div className="relative z-10 backdrop-blur-xl bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] rounded-3xl p-8 shadow-2xl shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 hover:shadow-[#00CD56]/50 transition-all duration-300 scale-100 md:scale-105 hover:scale-105 md:hover:scale-110 border-2 border-[#00CD56]/50 flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Популярен
            </div>

            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white mb-1">Про</h3>
              <p className="text-white/90">За средния бизнес и институции</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-lg text-white/70 line-through">
                  59.99 €
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">24.99 €</span>
                <span className="text-white/90">/месец</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "До 500 кг рециклиране месечно",
                "Разширена статистика и отчети",
                "Приоритетна поддръжка 24/7",
                "Достъп до ексклузивни предизвикателства",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-white">{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="/app/request-access"
              className="mt-auto block w-full py-3 px-6 text-center bg-white text-[#00CD56] font-semibold rounded-xl hover:bg-zinc-50 transition-colors shadow-lg"
            >
              Изберете план
            </a>
          </div>

          {/* Бизнес план */}
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-6 h-6 text-yellow-500" />
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Бизнес Супер
                </h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                За компании и организации
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-lg text-zinc-500 dark:text-zinc-500 line-through">
                  99.99 €
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                  59.99 €
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">/месец</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Корпоративно контролно табло",
                "Детайлен анализ и отчети",
                "Многопотребителски акаунти",
                "API интеграция",
                "Персонализирани предизвикателства",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#00CD56] flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/app/request-access"
              className="mt-auto block w-full py-3 px-6 text-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Свържете се с нас
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
