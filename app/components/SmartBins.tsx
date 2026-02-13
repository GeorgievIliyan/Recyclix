import { Check } from "lucide-react";

const SmartBins = () => {
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
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl overflow-hidden">
              <img
                src="/assets/smart_bin.png"
                alt="Интелигентен контейнер за рециклиране"
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </div>
          <div>
            <h2 className="text-4xl md:text-6xl font-meduim bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-6">
              <span className="text-green-400 to text-emerald-600 font-semibold">
                Smart
              </span>{" "}
              контейнери <br></br> и кошове
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Нашите интелигентни контейнери комбинират автоматично разпознаване
              на материали, свързана IoT инфраструктура и обработка на данни в
              реално време. Те отчитат всяко правилно изхвърляне прецизно и
              прозрачно, като превръщат процеса на рециклиране в ефективно,
              измеримо и мотивиращо изживяване.
            </p>
            <ul className="space-y-4">
              {[
                "Автоматично разпознаване на материали",
                "Реално време статистика и проследяване",
                "Интелигентно уведомяване при запълване",
                "Екологично чисти и енергийно ефективни",
              ].map((feature, i) => (
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
