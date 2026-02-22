interface ImpactProps {
  totalCO2Reduction: number | 0;
  totalPlasticRecycled: number | 0;
  totalGlassMetalRecycled: number | 0;
  totalPaperRecycled: number | 0;
}

// Функция за конвертиране на CO2 в kWh
function co2ToKwh(co2Kg: number | string): number {
  const CO2_PER_KWH = 0.4;
  const kgNum = Number(co2Kg) || 0;
  const kwh = kgNum / CO2_PER_KWH;
  return Math.round(kwh * 10) / 10;
}

// Функция за конвертиране на CO2 във вода
function co2ToWater(co2Kg: number | string): number {
  const WATER_PER_CO2 = 1.8;
  const kgNum = Number(co2Kg) || 0;
  const liters = kgNum * WATER_PER_CO2;
  return Math.round(liters * 10) / 10;
}

const Impact = ({
  totalCO2Reduction,
  totalGlassMetalRecycled,
  totalPlasticRecycled,
  totalPaperRecycled,
}: ImpactProps) => {
  return (
    <div id="impact" className="relative py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4">
            Вашето въздействие има значение
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Заедно можем да направим разлика за планетата
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-10 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl overflow-hidden">
            {/* Декоративен градиент */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00CD56]/10 to-transparent rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  Екологично въздействие
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-950/40 dark:to-zinc-900/40 rounded-xl border border-zinc-200/30 dark:border-zinc-800/50 hover:border-[#00CD56]/30 transition-all duration-300">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Спестен CO2
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent">
                    {totalCO2Reduction.toFixed(2)} кг
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-950/40 dark:to-zinc-900/40 rounded-xl border border-zinc-200/30 dark:border-zinc-800/50 hover:border-[#00CD56]/30 transition-all duration-300">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Спестена вода
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent">
                    {co2ToWater(totalCO2Reduction.toFixed(2))} литра
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-950/40 dark:to-zinc-900/40 rounded-xl border border-zinc-200/30 dark:border-zinc-800/50 hover:border-[#00CD56]/30 transition-all duration-300">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Спестена енергия
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent">
                    {co2ToKwh(totalCO2Reduction.toFixed(2))} kWh
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-10 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl overflow-hidden">
            {/* Декоративен градиент */}
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  Рециклирани материали
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-950/40 dark:to-zinc-900/40 rounded-xl border border-zinc-200/30 dark:border-zinc-800/50 hover:border-[#00CD56]/30 transition-all duration-300">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Пластмаса
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent">
                    {totalPlasticRecycled.toFixed(2)} кг
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-950/40 dark:to-zinc-900/40 rounded-xl border border-zinc-200/30 dark:border-zinc-800/50 hover:border-[#00CD56]/30 transition-all duration-300">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Хартия
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent">
                    {totalPaperRecycled.toFixed(2)} кг
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-zinc-100/80 to-zinc-50/80 dark:from-zinc-950/40 dark:to-zinc-900/40 rounded-xl border border-zinc-200/30 dark:border-zinc-800/50 hover:border-[#00CD56]/30 transition-all duration-300">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Метал и стъкло
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] bg-clip-text text-transparent">
                    {totalGlassMetalRecycled.toFixed(2)} кг
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impact;
