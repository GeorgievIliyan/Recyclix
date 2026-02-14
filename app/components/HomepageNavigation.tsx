import { useState } from "react";

const HomepageNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <img
                src="/logos/logo.svg"
                alt="Logo"
                className="aspect-1/1 h-7"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Recyclix
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#hero"
              className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium"
            >
              Начало
            </a>
            <a
              href="#features"
              className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium"
            >
              Предимства
            </a>
            <a
              href="#how-it-works"
              className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium"
            >
              Как работи
            </a>
            <a
              href="#impact"
              className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium"
            >
              Въздействие
            </a>
            <a
              href="#pricing"
              className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium"
            >
              Цени
            </a>
            <div className="flex items-center gap-3">
              <a
                href="/auth/login"
                className="px-5 py-2 text-green-400 to text-emerald-500 transition-colors font-medium"
              >
                Вход
              </a>
              <a
                href="/auth/register"
                className="px-6 py-2 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-[#00CD56]/30 transition-all duration-300 hover:scale-105 hover:shadow-[#00CD56]/40"
              >
                Регистрация
              </a>
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="px-4 py-4 space-y-3 bg-white/90 dark:bg-zinc-950/95 backdrop-blur-xl">
            <a
              href="#hero"
              className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Начало
            </a>
            <a
              href="#features"
              className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Предимства
            </a>
            <a
              href="#how-it-works"
              className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Как работи
            </a>
            <a
              href="#impact"
              className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Въздействие
            </a>
            <a
              href="#pricing"
              className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Цени
            </a>
            <a
              href="/auth/login"
              className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Вход
            </a>
            <a
              href="/auth/register"
              className="block px-4 py-2 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] text-white font-semibold rounded-xl text-center shadow-lg shadow-[#00CD56]/30"
            >
              Регистрация
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HomepageNavigation;
