"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { isDev } from "@/lib/isDev";
import Pricing from "./components/homepage/Pricing";
import SmartBins from "./components/homepage/SmartBins";
import HomepageFooter from "./components/homepage/HomepageFooter";
import CallToAction from "./components/homepage/CallToAction";
import HomepageNavigation from "./components/homepage/HomepageNavigation";
import Hero from "./components/homepage/Hero";
import Feature from "./components/homepage/Feature";
import HowItWorks from "./components/homepage/HowItWorks";
import Impact from "./components/homepage/Impact";
import Quote from "./components/homepage/Quote";

const CACHE_DURATION = 1 * 60 * 60 * 1000;

// Хук за анимация при скролиране
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// Компонент за анимирано появяване при скролиране
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Лента за прогрес на скролиране
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-50 h-[2px] bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 transition-all duration-100"
      style={{ width: `${progress}%` }}
      aria-hidden="true"
    />
  );
}

export default function Home() {
  const [totalUsers, setTotalUsers] = useState<number | string>("...");
  const [totalBins, setTotalBins] = useState<number | string>("...");
  const [totalC02Reduction, setTotalCO2Reduction] = useState<number | string>(
    "...",
  );
  const [totalPlasticRecycled, setTotalPlasticRecycled] = useState<
    number | string
  >("...");
  const [totalPaperRecycled, setTotalPaperRecycled] = useState<number | string>(
    "...",
  );
  const [totalGlassMetalRecycled, setTotalGlassMetalRecycled] = useState<
    number | string
  >("...");
  const [totalKgRecycled, setTotalKgRecycled] = useState<number | string>(
    "...",
  );

  // Функция за вземане на кеширани данни
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(`recyclix_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      // Проверка дали кеша е валиден (по-малко от 2 часа)
      if (now - timestamp < CACHE_DURATION) {
        return data;
      }

      // Кеша е изтекъл - изтриваме го
      localStorage.removeItem(`recyclix_${key}`);
      return null;
    } catch (error) {
      if (isDev) console.error("Грешка при четене от кеш:", error);
      return null;
    }
  };

  // Функция за запазване на данни в кеша
  const saveToCache = (key: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`recyclix_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      if (isDev) console.error("Грешка при запазване в кеш:", error);
    }
  };

  const fetchUserCount = async () => {
    // Първо проверяваме кеша
    const cached = getCachedData("users");
    if (cached !== null) {
      setTotalUsers(cached);
      return;
    }

    // Ако няма кеш, извличаме от Supabase
    const { data, error } = await supabase.rpc("get_user_count");
    if (!error && data !== null) {
      setTotalUsers(data);
      saveToCache("users", data);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на потребители:", error);
      }
      setTotalUsers(0);
    }
  };

  const fetchBinCount = async () => {
    const cached = getCachedData("bins");
    if (cached !== null) {
      setTotalBins(cached);
      return;
    }

    const { data, error } = await supabase.rpc("get_bins_count");
    if (!error && data !== null) {
      setTotalBins(data);
      saveToCache("bins", data);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на контейнери:", error);
      }
      setTotalBins("2000+");
    }
  };

  const fetchCO2Reduction = async () => {
    const cached = getCachedData("co2");
    if (cached !== null) {
      setTotalCO2Reduction(cached);
      return;
    }

    const { data, error } = await supabase.rpc("get_total_co2");
    if (!error) {
      setTotalCO2Reduction(data || 0);
      saveToCache("co2", data || 0);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на CO2:", error);
      }
      console.error("Грешка при извличане на CO2.");
      setTotalCO2Reduction(0);
    }
  };

  const fetchPlasticsRecycled = async () => {
    const cached = getCachedData("plastics");
    if (cached !== null) {
      setTotalPlasticRecycled(cached);
      return;
    }

    const { data, error } = await supabase.rpc("get_plastic_total");
    if (!error) {
      setTotalPlasticRecycled(data || 0);
      saveToCache("plastics", data || 0);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на пластмаса:", error);
      }
      console.error("Не може да се извлекат пластмасите.");
      setTotalPlasticRecycled(0);
    }
  };

  const fetchPaperRecycled = async () => {
    const cached = getCachedData("paper");
    if (cached !== null) {
      setTotalPaperRecycled(cached);
      return;
    }

    const { data, error } = await supabase.rpc("get_paper_total");
    if (!error) {
      setTotalPaperRecycled(data || 0);
      saveToCache("paper", data || 0);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на хартия:", error);
      }
      console.error("Не може да се извлекат хартиите.");
      setTotalPaperRecycled(0);
    }
  };

  const fetchGlassMetalRecycled = async () => {
    const cached = getCachedData("glass_metal");
    if (cached !== null) {
      setTotalGlassMetalRecycled(cached);
      return;
    }

    const { data, error } = await supabase.rpc("get_glass_metal_total");
    if (!error) {
      setTotalGlassMetalRecycled(data || 0);
      saveToCache("glass_metal", data || 0);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на стъкло и метал:", error);
      }
      console.error("Не може да се извлекат стъкло и метал.");
      setTotalGlassMetalRecycled(0);
    }
  };

  const fetchTotalKgRecycled = async () => {
    const cached = getCachedData("total_kg");
    if (cached !== null) {
      setTotalKgRecycled(cached);
      return;
    }

    const { data, error } = await supabase.rpc("get_kg_total");
    if (!error) {
      setTotalKgRecycled(data || 0);
      saveToCache("total_kg", data || 0);
    } else {
      if (isDev) {
        console.error("Грешка при извличане на общо KG:", error);
      }
      console.error("Не може да се извлекат общите KG.");
      setTotalKgRecycled(0);
    }
  };

  // Функция за принудително обновяване на всички данни
  const forceRefreshAll = async () => {
    // Изчистваме целия кеш
    const keys = [
      "users",
      "bins",
      "co2",
      "plastics",
      "paper",
      "glass_metal",
      "total_kg",
    ];
    keys.forEach((key) => {
      localStorage.removeItem(`recyclix_${key}`);
    });

    // Извличаме наново всички данни
    await Promise.all([
      fetchUserCount(),
      fetchBinCount(),
      fetchCO2Reduction(),
      fetchGlassMetalRecycled(),
      fetchPlasticsRecycled(),
      fetchPaperRecycled(),
      fetchTotalKgRecycled(),
    ]);
  };

  useEffect(() => {
    // Извличаме всички данни при зареждане на страницата
    fetchUserCount();
    fetchBinCount();
    fetchCO2Reduction();
    fetchGlassMetalRecycled();
    fetchPlasticsRecycled();
    fetchPaperRecycled();
    fetchTotalKgRecycled();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <ScrollProgressBar />

      {/* Навигация */}
      <HomepageNavigation />

      {/* Hero секция */}
      <Hero
        totalBins={Number(totalBins) || 0}
        totalKgRecycled={Number(totalKgRecycled) || 0}
        totalUsers={Number(totalUsers) || 0}
      />

      {/* Функции */}
      <Reveal>
        <Feature />
      </Reveal>

      {/* Как работи */}
      <Reveal delay={60}>
        <HowItWorks />
      </Reveal>

      {/* Въздействие */}
      <Reveal>
        <Impact
          totalCO2Reduction={Number(totalC02Reduction)}
          totalGlassMetalRecycled={Number(totalGlassMetalRecycled)}
          totalPaperRecycled={Number(totalPaperRecycled)}
          totalPlasticRecycled={Number(totalPlasticRecycled)}
        />
      </Reveal>

      {/* Цитат */}
      <Reveal delay={40}>
        <Quote />
      </Reveal>

      {/* Секция за интелигентни кошове */}
      <Reveal>
        <SmartBins />
      </Reveal>

      {/* Секция за абонаментни планове */}
      <Reveal>
        <Pricing />
      </Reveal>

      {/* Започнете сега секция */}
      <Reveal delay={60}>
        <CallToAction />
      </Reveal>

      {/* Футър */}
      <HomepageFooter />
    </div>
  );
}