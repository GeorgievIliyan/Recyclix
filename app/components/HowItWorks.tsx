const HowItWorks = () => {
  return (
    <div
      id="how-it-works"
      className="relative py-20 px-4 bg-gradient-to-b from-transparent via-zinc-100/50 to-transparent dark:via-zinc-900/20"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4">
            Как работи?
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Започнете да рециклирате с Recyclix само с 3 лесни стъпки
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Регистрирайте се",
              desc: "Създайте безплатен акаунт за по-малко от минута и започнете да следите вашия рециклиращ прогрес.",
            },
            {
              step: "2",
              title: "Намерете пункт",
              desc: "Използвайте нашата интерактивна карта, за да намерите най-близкия пункт за рециклиране до вас.",
            },
            {
              step: "3",
              title: "Печелете точки",
              desc: "Рециклирайте материали и автоматично печелете точки, които можете да разменяте за награди.",
            },
          ].map((s, i) => (
            <div key={i} className="relative group">
              <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/80 to-zinc-50/90 dark:from-zinc-900/70 dark:via-zinc-900/60 dark:to-zinc-800/70 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl hover:shadow-2xl hover:border-[#00CD56]/30 dark:hover:border-[#00CD56]/30 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00CD56]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] rounded-xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30 group-hover:shadow-[#00CD56]/50 group-hover:scale-110 transition-all duration-300">
                  <span className="text-2xl font-bold text-white">
                    {s.step}
                  </span>
                </div>
                <div className="relative z-10 mt-6">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                    {s.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
