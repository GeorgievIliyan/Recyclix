const Quote = () => {
  return (
    <div className="relative py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-[#00CD56]/10 via-emerald-400/8 to-[#00b849]/5 dark:from-[#00CD56]/10 dark:via-emerald-400/5 dark:to-transparent rounded-3xl p-10 border border-[#00CD56]/20 dark:border-zinc-800/50 shadow-xl overflow-hidden">
          {/* Деликатни градиентни акценти */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-[#00CD56]/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-emerald-400/15 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-block p-3 bg-gradient-to-br from-[#00CD56]/20 to-emerald-400/20 rounded-2xl mb-6">
              <svg
                className="w-12 h-12 text-[#00CD56]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>
            <p className="text-xl md:text-2xl text-zinc-700 dark:text-zinc-300 mb-6 italic leading-relaxed">
              "Всяко малко действие има значение. Когато рециклираме заедно,
              създаваме по-чисто и по-устойчиво бъдеще за следващите поколения."
            </p>
            <div className="h-1 w-24 bg-gradient-to-r from-[#00CD56] via-emerald-500 to-[#00b849] rounded-full mx-auto shadow-lg shadow-[#00CD56]/30" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quote;
