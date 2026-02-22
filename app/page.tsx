"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { isDev } from "@/lib/isDev";
import Pricing from "./components/Pricing";
import SmartBins from "./components/SmartBins";
import HomepageFooter from "./components/HomepageFooter";
import CallToAction from "./components/CallToAction";
import HomepageNavigation from "./components/HomepageNavigation";
import Hero from "./components/Hero";
import Feature from "./components/Feature";
import HowItWorks from "./components/HowItWorks";
import Impact from "./components/Impact";
import Quote from "./components/Quote";

const CACHE_DURATION = 2 * 60 * 60 * 1000;

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
      {/* Навигация */}
      <HomepageNavigation />

      {/* Hero секция */}
      <Hero
        totalBins={Number(totalBins) || 0}
        totalKgRecycled={Number(totalKgRecycled) || 0}
        totalUsers={Number(totalUsers) || 0}
      />

      {/* Функции */}
      <Feature />

      {/* Как работи */}
      <HowItWorks />

      {/* Въздействие */}
      <Impact
        totalCO2Reduction={Number(totalC02Reduction)}
        totalGlassMetalRecycled={Number(totalGlassMetalRecycled)}
        totalPaperRecycled={Number(totalPaperRecycled)}
        totalPlasticRecycled={Number(totalPlasticRecycled)}
      />

      {/* цитат */}
      <Quote />

      {/* Секция за интелигентни кошове */}
      <SmartBins />

      {/* Секция за абонаментни планове */}
      <Pricing />

      {/* Започнете секция */}
      <CallToAction />

      {/* Футър */}
      <HomepageFooter />
    </div>
  );
}
