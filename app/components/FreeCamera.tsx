"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  X,
  Loader2,
  CheckCircle2,
  OctagonAlert,
  Leaf,
  Recycle,
  Wind,
  Weight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SpinningRecyclingLoader } from "./RecyclingLoader";
import { isDev } from "@/lib/isDev";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);

type ScanResult = {
  material?: string;
  count: number;
  points: number;
  co2?: number;
  weight?: number;
  error?: string;
};

type QRData = {
  token: string;
  qrUrl: string;
  expiresAt: string;
  points: number;
};

const MATERIAL_TRANSLATIONS: Record<string, string> = {
  plastic: "Пластмаса",
  glass: "Стъкло",
  paper: "Хартия",
  metal: "Метал",
  "e-waste": "Електроотпадъци",
  ewaste: "Електроотпадъци",
  electronics: "Електроотпадъци",
  organic: "Органични отпадъци",
  textile: "Текстил",
  textiles: "Текстил",
};

function translateMaterial(material: string): string {
  const normalized = material.toLowerCase().trim();
  return MATERIAL_TRANSLATIONS[normalized] ?? material;
}

// Брои от 0 до `value` при монтиране
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let current = 0;
    const steps = 40;
    const increment = value / steps;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplay(value); clearInterval(interval); }
      else setDisplay(current);
    }, 18);
    return () => clearInterval(interval);
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

function StatPill({
  icon,
  label,
  value,
  unit,
  decimals = 0,
  border,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  border: string;
  iconColor: string;
}) {
  return (
    <div className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 bg-white/5 border ${border}`}>
      <div className={iconColor}>{icon}</div>
      <div className="text-lg font-bold text-white leading-none tabular-nums">
        <CountUp value={value} decimals={decimals} />
        <span className="text-[11px] font-normal ml-0.5 opacity-60">{unit}</span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-white/40 text-center leading-tight">{label}</p>
    </div>
  );
}

export function FreeCamera({ task }: { task: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (!open) return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => setError("Camera access denied"));
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  async function logToSchema(data: ScanResult) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (isDev) console.log("[FreeCamera] Session user:", session?.user?.id ?? "NULL");
      if (!session) return;
      await fetch("/api/recycling/log", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ material: data.material || "Unknown", points: data.points, co2_saved: data.co2 || 0, count: data.count }),
      });
    } catch (e) { if (isDev) console.error("Failed to log recycling event:", e); }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true); setError(null); setResult(null); setQrData(null);
    const video = videoRef.current, canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/jpeg", 0.8);
    try {
      const res = await fetch("/api/free-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataURL, task }) });
      const json: ScanResult = await res.json();
      if (!res.ok) { setError(json.error || "Scan failed"); return; }
      if (json.material?.toLowerCase() === "unknown") { setError("Материала не може да бъде разпознат. Моля, опитайте отново!"); return; }
      const translated = { ...json, material: json.material ? translateMaterial(json.material) : json.material };
      setResult(translated);
      await logToSchema(json); // log original English material to DB
      generateQRCode(json.points);
    } catch (e: any) { setError(e.message || "Network error"); }
    finally { setLoading(false); }
  }

  async function generateQRCode(points: number) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/temporary-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-token": process.env.NEXT_PUBLIC_SECURE_API_KEY!, ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ points }),
      });
      if (!res.ok) { console.error("Failed to generate QR code"); return; }
      const data = await res.json();
      setQrData({ token: data.token, qrUrl: data.qrUrl, expiresAt: data.expiresAt, points });
    } catch (e) { console.error("QR generation error:", e); }
  }

  useEffect(() => {
    if (!qrData) return;
    const timer = setTimeout(() => { setQrData(null); setResult(null); }, Math.min(new Date(qrData.expiresAt).getTime() - Date.now(), 5 * 60 * 1000));
    return () => clearTimeout(timer);
  }, [qrData]);

  const closeModal = () => { setOpen(false); setResult(null); setError(null); setQrData(null); };
  const showOverlay = loading || !!result || !!error;

  return (
    <>
      <div className="w-full h-full">
        <div
          onClick={() => setOpen(true)}
          className="w-full h-full group relative overflow-hidden rounded-xl border cursor-pointer
            bg-card border-border hover:border-green-400 hover:shadow-lg hover:shadow-green-200/50
            dark:hover:shadow-green-500/20 transition-all duration-300 flex flex-col"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-400" />
          <div className="flex-1 p-5 flex flex-col">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Camera className="h-6 w-6 text-green-500 group-hover:text-green-600 transition-colors flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">Свободно сканиране</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
              Сканирайте рециклируеми артикули по всяко време без конкретна задача
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
                <Leaf className="h-3 w-3" />
                Свободно сканиране
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <button className="group/btn relative w-full px-4 py-2.5 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md shadow-[#00CD56]/20 hover:shadow-lg hover:shadow-[#00CD56]/30 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                <span className="relative z-10">Отвори камера</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full h-full flex flex-col">

            {/* Заглавие */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  <h3 className="text-white font-semibold text-base md:text-lg">Свободно сканиране</h3>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors" aria-label="Затвори">
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
            </div>

            {/* Видеo постоянно */}
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Тъмен слой */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none"
              style={{ opacity: showOverlay ? 1 : 0 }}
            />

            {/* Долен панел */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6 lg:p-8">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">

                {loading && (
                  <div className="flex flex-col items-center gap-4">
                    <SpinningRecyclingLoader />
                    <p className="text-white font-medium animate-pulse">Анализиране...</p>
                  </div>
                )}

                {result && !loading && (
                  <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-md">

                    {/* Заглавие материал + XP */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">Открит материал</p>
                          <p className="text-white font-bold uppercase tracking-wide text-sm">{result.material}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/25">
                        <span className="text-xs font-bold text-green-400">+{result.points} XP</span>
                      </div>
                    </div>

                    {/* Статистически табелки */}
                    <div className="flex gap-2 px-5 py-4">
                      <StatPill
                        icon={<Recycle className="w-4 h-4" />}
                        label="Брой"
                        value={result.count}
                        unit=" бр."
                        border="border-green-500/20"
                        iconColor="text-green-400"
                      />
                      {(result.weight ?? 0) > 0 && (
                        <StatPill
                          icon={<Weight className="w-4 h-4" />}
                          label="Тегло"
                          value={result.weight!}
                          unit=" г"
                          border="border-sky-500/20"
                          iconColor="text-sky-400"
                        />
                      )}
                      {(result.co2 ?? 0) > 0 && (
                        <StatPill
                          icon={<Wind className="w-4 h-4" />}
                          label="CO₂ спестен"
                          value={result.co2!}
                          unit=" кг"
                          decimals={3}
                          border="border-emerald-500/20"
                          iconColor="text-emerald-400"
                        />
                      )}
                    </div>

                    {/* QR секция */}
                    <div className="flex flex-col items-center gap-2 px-5 pb-4 border-t border-white/5 pt-4">
                      {qrData ? (
                        <>
                          <div className="bg-white p-3 rounded-lg shadow-lg">
                            <QRCodeSVG value={qrData.qrUrl} size={150} />
                          </div>
                          <p className="text-xs text-zinc-500">или</p>
                          <a href={qrData.qrUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-green-400 hover:text-green-300 transition-colors">
                            Вземи от тук
                          </a>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-white/50 py-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Генериране на QR...</span>
                        </div>
                      )}
                    </div>

                    {/* Затвори */}
                    <div className="px-5 pb-5">
                      <button onClick={closeModal} className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200">
                        Затвори
                      </button>
                    </div>
                  </div>
                )}

                {error && !loading && (
                  <div className="w-full p-6 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <OctagonAlert className="w-12 h-12 text-red-500" />
                      <h4 className="text-lg font-semibold text-white">Сканирането не беше успешно</h4>
                      <p className="text-sm text-white/80 text-center">{error}</p>
                      <div className="flex gap-3 w-full">
                        <button onClick={() => { setError(null); setResult(null); }} className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-all duration-200 backdrop-blur-sm">
                          Нова снимка
                        </button>
                        <button onClick={closeModal} className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all duration-200">
                          Затвори
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!result && !error && !loading && (
                  <button
                    onClick={capture}
                    className="w-full px-6 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-base md:text-lg overflow-hidden group/btn relative"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Camera className="h-5 w-5 md:h-6 md:w-6" />
                      Заснеми
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </button>
                )}

              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}