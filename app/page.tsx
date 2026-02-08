"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-browser";
import { isDev } from "@/lib/isDev";

const CACHE_DURATION = 2 * 60 * 60 * 1000;

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [totalUsers, setTotalUsers] = useState<number | string>("...")
  const [totalBins, setTotalBins] = useState<number | string>("...")
  const [totalC02Reduction, setTotalCO2Reduction] = useState<number | string>("...")
  const [totalPlasticRecycled, setTotalPlasticRecycled] = useState<number | string>("...")
  const [totalPaperRecycled, setTotalPaperRecycled] = useState<number | string>("...")
  const [totalGlassMetalRecycled, setTotalGlassMetalRecycled] = useState<number | string>("...")
  const [totalKgRecycled, setTotalKgRecycled] = useState<number | string>("...")

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
        timestamp: Date.now()
      };
      localStorage.setItem(`recyclix_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      if (isDev) console.error("Грешка при запазване в кеш:", error);
    }
  };

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

  const fetchUserCount = async () => {
    // Първо проверяваме кеша
    const cached = getCachedData('users');
    if (cached !== null) {
      setTotalUsers(cached);
      return;
    }
    
    // Ако няма кеш, извличаме от Supabase
    const { data, error } = await supabase.rpc('get_user_count');
    if (!error && data !== null) {
      setTotalUsers(data);
      saveToCache('users', data);
    } else {
      if (isDev){
        console.error("Грешка при извличане на потребители:", error);
      }
      setTotalUsers(0);
    }
  };

  const fetchBinCount = async () => {
    const cached = getCachedData('bins');
    if (cached !== null) {
      setTotalBins(cached);
      return;
    }
    
    const { data, error } = await supabase.rpc('get_bins_count');
    if (!error && data !== null) {
      setTotalBins(data);
      saveToCache('bins', data);
    } else {
      if (isDev){
        console.error("Грешка при извличане на контейнери:", error);
      }
      setTotalBins("2000+");
    }
  };

  const fetchCO2Reduction = async () => {
    const cached = getCachedData('co2');
    if (cached !== null) {
      setTotalCO2Reduction(cached);
      return;
    }
    
    const { data, error } = await supabase.rpc('get_total_co2');
    if (!error) {
      setTotalCO2Reduction(data || 0);
      saveToCache('co2', data || 0);
    } else {
      if (isDev){
        console.error("Грешка при извличане на CO2:", error);
      }
      console.error("Грешка при извличане на CO2.")
      setTotalCO2Reduction(0);
    }
  }

  const fetchPlasticsRecycled = async () => {
    const cached = getCachedData('plastics');
    if (cached !== null) {
      setTotalPlasticRecycled(cached);
      return;
    }
    
    const { data, error } = await supabase.rpc('get_plastic_total');
    if (!error) {
      setTotalPlasticRecycled(data || 0);
      saveToCache('plastics', data || 0);
    } else {
      if (isDev){
        console.error("Грешка при извличане на пластмаса:", error);
      }
      console.error("Не може да се извлекат пластмасите.")
      setTotalPlasticRecycled(0);
    }
  }

  const fetchPaperRecycled = async () => {
    const cached = getCachedData('paper');
    if (cached !== null) {
      setTotalPaperRecycled(cached);
      return;
    }
    
    const { data, error } = await supabase.rpc('get_paper_total');
    if (!error) {
      setTotalPaperRecycled(data || 0);
      saveToCache('paper', data || 0);
    } else {
      if (isDev){
        console.error("Грешка при извличане на хартия:", error);
      }
      console.error("Не може да се извлекат хартиите.")
      setTotalPaperRecycled(0);
    }
  }

  const fetchGlassMetalRecycled = async () => {
    const cached = getCachedData('glass_metal');
    if (cached !== null) {
      setTotalGlassMetalRecycled(cached);
      return;
    }
    
    const { data, error } = await supabase.rpc('get_glass_metal_total');
    if (!error) {
      setTotalGlassMetalRecycled(data || 0);
      saveToCache('glass_metal', data || 0);
    } else {
      if (isDev){
        console.error("Грешка при извличане на стъкло и метал:", error);
      }
      console.error("Не може да се извлекат стъкло и метал.")
      setTotalGlassMetalRecycled(0);
    }
  }

  const fetchTotalKgRecycled = async () => {
    const cached = getCachedData('total_kg');
    if (cached !== null) {
      setTotalKgRecycled(cached);
      return;
    }
    
    const {data, error} = await supabase.rpc('get_kg_total')
    if (!error) {
      setTotalKgRecycled(data || 0);
      saveToCache('total_kg', data || 0);
    } else {
      if (isDev){
        console.error("Грешка при извличане на общо KG:", error);
      }
      console.error("Не може да се извлекат общите KG.")
      setTotalKgRecycled(0);
    }
  }

  // Функция за принудително обновяване на всички данни
  const forceRefreshAll = async () => {
    // Изчистваме целия кеш
    const keys = ['users', 'bins', 'co2', 'plastics', 'paper', 'glass_metal', 'total_kg'];
    keys.forEach(key => {
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
      fetchTotalKgRecycled()
    ]);
  }

  useEffect(() => {
    // Извличаме всички данни при зареждане на страницата
    fetchUserCount()
    fetchBinCount()
    fetchCO2Reduction()
    fetchGlassMetalRecycled()
    fetchPlasticsRecycled()
    fetchPaperRecycled()
    fetchTotalKgRecycled()
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <img src="/logos/logo.svg" alt="Logo" className="aspect-1/1 h-7" />
                <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                  Recyclix
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#hero" className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium">Начало</a>
              <a href="#features" className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium">Предимства</a>
              <a href="#how-it-works" className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium">Как работи</a>
              <a href="#impact" className="text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium">Въздействие</a>
              <div className="flex items-center gap-3">
                <a href="/auth/login" className="px-5 py-2 text-zinc-700 dark:text-zinc-300 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition-colors font-medium">Вход</a>
                <a href="/auth/register" className="px-6 py-2 bg-gradient-to-r from-[#00CD56] to-[#00b849] hover:from-[#00b849] hover:to-[#00a341] text-white font-semibold rounded-xl shadow-lg shadow-[#00CD56]/30 transition-all duration-300 hover:scale-105">Регистрация</a>
              </div>
            </div>

            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
            <div className="px-4 py-4 space-y-3 bg-white/90 dark:bg-zinc-950/95 backdrop-blur-xl">
              <a href="#hero" className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">Начало</a>
              <a href="#features" className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">Предимства</a>
              <a href="#how-it-works" className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">Как работи</a>
              <a href="#impact" className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">Въздействие</a>
              <a href="/auth/login" className="block px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium">Вход</a>
              <a href="/auth/register" className="block px-4 py-2 bg-gradient-to-r from-[#00CD56] to-[#00b849] text-white font-semibold rounded-xl text-center shadow-lg shadow-[#00CD56]/30">Регистрация</a>
            </div>
          </div>
        )}
      </nav>

      <div id="hero" className="relative min-h-[85vh] flex items-center justify-center p-4 overflow-hidden pt-16">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-[#00CD56]/20 dark:bg-[#00CD56]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-[#00CD56]/15 dark:bg-[#00CD56]/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00CD56]/5 dark:bg-[#00CD56]/3 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <h1 className="text-5xl md:text-5xl lg:text-6xl font-semibold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4 leading-tight">
              Рециклирай за <br></br>по-добро бъдеще
            </h1>
            <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              Присъединете се към нашата платформа за рециклиране и помогнете за опазване на околната среда. Лесно, бързо и ефективо.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a href="/auth/register" className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#00CD56] to-[#00b849] hover:from-[#00b849] hover:to-[#00a341] text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 transition-all duration-300 hover:scale-105 active:scale-95">Започнете сега</a>
            <a href="/auth/login" className="w-full sm:w-auto px-10 py-4 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/40 border-2 border-zinc-300/50 dark:border-zinc-800/50 text-zinc-900 dark:text-white text-lg font-semibold rounded-2xl shadow-xl hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all duration-300 hover:scale-105 active:scale-95">Вход</a>
          </div>

          <div className="backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent mb-2">{totalUsers}</div>
                <div className="text-zinc-600 dark:text-zinc-400">Активни потребители</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent mb-2">{totalKgRecycled} кг.</div>
                <div className="text-zinc-600 dark:text-zinc-400">Рециклирани материали</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent mb-2">{totalBins}</div>
                <div className="text-zinc-600 dark:text-zinc-400">Пунктове за рециклиране</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4">Защо да изберете Recyclix?</h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">Ние правим рециклирането лесно, награждаващо и забавно за всички</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Лесно рециклиране", desc: "Намерете най-близките пунктове за рециклиране и научете какво може да се рециклира с интерактивната ни карта.", icon: <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> },
              { title: "Печелете награди", desc: "Получавайте точки и награди за всяко рециклиране. Разменете точките си за ваучери и отстъпки.", icon: <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              { title: "Присъединете се", desc: "Споделяйте опит, вдъхновявайте други и участвайте в предизвикателства за рециклиране.", icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> }
            ].map((f, i) => (
              <div key={i} className="backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl dark:shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#00CD56] to-[#00b849] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 text-center">{f.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="how-it-works" className="relative py-20 px-4 bg-gradient-to-b from-transparent via-zinc-100/50 to-transparent dark:via-zinc-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4">Как работи?</h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">Започнете да рециклирате с Recyclix само с 3 лесни стъпки</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Регистрирайте се", desc: "Създайте безплатен акаунт за по-малко от минута и започнете да следите вашия рециклиращ прогрес." },
              { step: "2", title: "Намерете пункт", desc: "Използвайте нашата интерактивна карта, за да намерите най-близкия пункт за рециклиране до вас." },
              { step: "3", title: "Печелете точки", desc: "Рециклирайте материали и автоматично печелете точки, които можете да разменяте за награди." }
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 rounded-3xl p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl transition-all duration-300">
                  <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-[#00CD56] to-[#00b849] rounded-xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30">
                    <span className="text-2xl font-bold text-white">{s.step}</span>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">{s.title}</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="impact" className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-4">Вашето въздействие има значение</h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">Заедно можем да направим разлика за планетата</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 rounded-3xl p-10 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#00CD56] to-[#00b849] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Екологично въздействие</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-zinc-100/80 dark:bg-zinc-950/40 rounded-xl border border-transparent dark:border-zinc-800/50">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Спестен CO2</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">{totalC02Reduction} кг</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-100/80 dark:bg-zinc-950/40 rounded-xl border border-transparent dark:border-zinc-800/50">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Спестена вода</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">{co2ToWater(totalC02Reduction)} литра</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-100/80 dark:bg-zinc-950/40 rounded-xl border border-transparent dark:border-zinc-800/50">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Спестена енергия</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">{co2ToKwh(totalC02Reduction)} kWh</span>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/80 dark:bg-zinc-900/60 rounded-3xl p-10 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#00CD56] to-[#00b849] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00CD56]/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Рециклирани материали</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-zinc-100/80 dark:bg-zinc-950/40 rounded-xl border border-transparent dark:border-zinc-800/50">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Пластмаса</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">{totalPlasticRecycled} кг</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-100/80 dark:bg-zinc-950/40 rounded-xl border border-transparent dark:border-zinc-800/50">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Хартия</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">{totalPaperRecycled} кг</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-100/80 dark:bg-zinc-950/40 rounded-xl border border-transparent dark:border-zinc-800/50">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Метал и стъкло</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">{totalGlassMetalRecycled} кг</span>
                </div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-[#00CD56]/10 to-[#00b849]/5 dark:from-[#00CD56]/10 dark:to-transparent rounded-3xl p-10 border border-[#00CD56]/20 dark:border-zinc-800/50 shadow-xl">
            <div className="text-center max-w-3xl mx-auto">
              <svg className="w-12 h-12 text-[#00CD56] mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-xl md:text-2xl text-zinc-700 dark:text-zinc-300 mb-6 italic leading-relaxed">
                "Всяко малко действие има значение. Когато рециклираме заедно, създаваме по-чисто и по-устойчиво бъдеще за следващите поколения."
              </p>
              <div className="h-1 w-24 bg-gradient-to-r from-[#00CD56] to-[#00b849] rounded-full mx-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative py-20 px-4">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00CD56]/10 dark:bg-[#00CD56]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white bg-clip-text text-transparent mb-6">Готови ли сте да направите промяната?</h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">Присъединете се към хиляди потребители, които вече правят разликата. Започнете да рециклирате днес!</p>
          <a href="/auth/register" className="inline-block px-12 py-5 bg-gradient-to-r from-[#00CD56] to-[#00b849] hover:from-[#00b849] hover:to-[#00a341] text-white text-xl font-semibold rounded-2xl shadow-2xl shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 transition-all duration-300 hover:scale-105 active:scale-95">Започнете безплатно</a>
        </div>
      </div>

      <footer className="relative border-t border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logos/logo.svg" alt="Logo" className="aspect-1/1 h-6" />
                <span className="text-2xl font-semibold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">Recyclix</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">Платформата за рециклиране, която прави опазването на околната среда лесно и награждаващо.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Бързи връзки</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] transition-colors">Предимства</a></li>
                <li><a href="#how-it-works" className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] transition-colors">Как работи</a></li>
                <li><a href="#impact" className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] transition-colors">Въздействие</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Акаунт</h4>
              <ul className="space-y-2">
                <li><a href="/auth/login" className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] transition-colors">Вход</a></li>
                <li><a href="/auth/register" className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] transition-colors">Регистрация</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-500 dark:text-zinc-500 text-sm">
            © {new Date().getFullYear()} Recyclix. Всички права запазени.
          </div>
        </div>
      </footer>
    </div>
  )
}