import { Quote as QuoteIcon } from "lucide-react";

const Quote = () => {
  return (
    <div className="relative py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-[#00CD56]/10 via-emerald-400/8 to-[#00b849]/5 dark:from-[#00CD56]/10 dark:via-emerald-400/5 dark:to-transparent rounded-3xl p-10 border border-[#00CD56]/20 dark:border-zinc-800/50 shadow-xl overflow-hidden">
          {/* Деликатни градиентни акценти */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-[#00CD56]/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-emerald-400/15 to-transparent rounded-full blur-3xl" />

          {/* Декоративни кавички на фона */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
            <QuoteIcon
              className="text-[#00CD56]/5 dark:text-[#00CD56]/4"
              style={{ width: 320, height: 320 }}
              strokeWidth={1}
            />
          </div>

          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#00CD56]/20 to-emerald-400/20 rounded-2xl mb-6 ring-1 ring-[#00CD56]/25">
              <QuoteIcon className="w-6 h-6 text-[#00CD56]" strokeWidth={2} />
            </div>

            <p className="text-xl md:text-2xl text-zinc-700 dark:text-zinc-300 mb-8 italic leading-relaxed tracking-wide">
              "Всяко малко действие има значение. Когато рециклираме заедно,
              създаваме по-чисто и по-устойчиво бъдеще за следващите поколения."
            </p>

            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#00CD56]/60 rounded-full" />
              <div className="h-1.5 w-24 bg-gradient-to-r from-[#00CD56] via-emerald-500 to-[#00b849] rounded-full shadow-lg shadow-[#00CD56]/30" />
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#00CD56]/60 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quote;