import React from 'react'

const WorkInProgress = () => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-zinc-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-zinc-900 flex items-center justify-center overflow-hidden">

      {/* Фонов блясък — горе вляво */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[120px]" />

      {/* Фонов блясък — долу вдясно */}
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">

        {/* Анимирана икона */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 shadow-xl shadow-green-500/30 flex items-center justify-center">
            {/* Иконка с чук и гаечен ключ */}
            <svg
              className="w-11 h-11 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Надпис */}
        <div className="space-y-3 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            В разработка
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Тази страница е в процес на изграждане.<br />
          </p>
        </div>
      </div>
    </div>
  )
}

export default WorkInProgress