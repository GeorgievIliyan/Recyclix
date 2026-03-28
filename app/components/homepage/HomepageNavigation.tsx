"use client"

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown } from "lucide-react";

const languages = [
  { code: "bg", label: "БГ", name: "Български" },
  { code: "en", label: "EN", name: "English" },
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "ru", label: "РУ", name: "Русский" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "es", label: "ES", name: "Español" },
];

const HomepageNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // or skeleton
  }

  const currentLang = languages.find((l) => l.code === i18n.language) ?? languages[0];

  const handleLanguageChange = (code: string) => {
    localStorage.setItem("lang", code);
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  const navLinks = [
    ["#hero", t("nav.home")],
    ["#features", t("nav.features")],
    ["#how-it-works", t("nav.howItWorks")],
    ["#impact", t("nav.impact")],
    ["#pricing", t("nav.pricing")],
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-0">
        <div className="flex items-center justify-between h-16">

          <div className="flex items-center gap-2">
            <img src="/logos/logo.svg" alt="Logo" className="aspect-1/1 h-7" />
            <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Recyclix
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] transition-colors font-medium"
              >
                {label}
              </a>
            ))}

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-medium text-sm"
                >
                  <Globe className="w-4 h-4" />
                  <span>{mounted ? currentLang.label : "..."}</span>
                  <ChevronDown className={"w-3.5 h-3.5 transition-transform" + (langOpen ? " rotate-180" : "")} />
                </button>

                {langOpen && (
                  <div>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1.5 w-36 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl shadow-lg overflow-hidden">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleLanguageChange(lang.code)}
                          className={"w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors " + (lang.code === currentLang.code ? "text-[#00CD56] bg-green-50 dark:bg-green-500/10 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-[#00CD56]")}
                        >
                          <span className="w-6 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{lang.label}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <a href="/auth/login" className="px-5 py-2 text-green-400 transition-colors font-medium">
                {t("nav.login")}
              </a>

              <a
                href="/auth/register"
                className="px-6 py-2 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-[#00CD56]/30 transition-all duration-300 hover:scale-105 hover:shadow-[#00CD56]/40"
              >
                {t("nav.register")}
              </a>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-sm font-medium"
              >
                <Globe className="w-4 h-4" />
                <span>{mounted ? currentLang.label : "..."}</span>
              </button>

              {langOpen && (
                <div>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1.5 w-36 bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl shadow-lg overflow-hidden">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={"w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors " + (lang.code === currentLang.code ? "text-[#00CD56] bg-green-50 dark:bg-green-500/10 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-[#00CD56]")}
                      >
                        <span className="w-6 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{lang.label}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="px-4 py-3 backdrop-blur-sm bg-white/80 dark:bg-zinc-900/5">
            <div className="space-y-2">
              {navLinks.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="block py-2 px-3 text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all font-medium"
                >
                  {label}
                </a>
              ))}

              <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 my-2"></div>

              <a
                href="/auth/login"
                className="block py-2 px-3 text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all font-medium"
              >
                {t("nav.login")}
              </a>

              <a
                href="/auth/register"
                className="block py-2 px-3 mt-2 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-xl text-center shadow-lg shadow-[#00CD56]/30 transition-all duration-300 hover:scale-[1.02]"
              >
                {t("nav.register")}
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HomepageNavigation;