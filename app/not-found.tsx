"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-zinc-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-zinc-900 flex items-center justify-center overflow-hidden">
      
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 shadow-xl shadow-green-500/30 flex items-center justify-center">
            <Search className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("notFound.notFound")}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {t("notFound.sorry")}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:gap-1">
          <Link href="/" className="px-3 py-1.5 rounded-lg hover:text-green-500 hover:bg-green-500/8 transition-all duration-150">
            {t("notFound.homepage")}
          </Link>
          <Link href="/app/dashboard" className="px-3 py-1.5 rounded-lg hover:text-green-500 hover:bg-green-500/8 transition-all duration-150">
            {t("notFound.dashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;