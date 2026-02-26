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
  error?: string;
};

type QRData = {
  token: string;
  qrUrl: string;
  expiresAt: string;
  points: number;
};

export function FreeCamera({ task }: { task: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
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
      console.log("[FreeCamera] Session user:", session?.user?.id ?? "NULL");
      console.log("[FreeCamera] Access token:", session?.access_token ? "присъства" : "NULL");
      if (!session) return;

      await fetch("/api/recycling/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          material: data.material || "Unknown",
          points: data.points,
          co2_saved: data.co2 || 0,
          count: data.count,
        }),
      });
    } catch (e) {
      if (isDev) {
        console.error("Failed to log recycling event:", e);
      }
    }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setQrData(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const res = await fetch("/api/free-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataURL, task }),
      });

      const json: ScanResult = await res.json();

      if (!res.ok) {
        setError(json.error || "Scan failed");
        return;
      }

      if (json.material?.toLowerCase() === "unknown") {
        setError("Материала не може да бъде разпознат. Моля, опитайте отново!");
        return;
      }
      setResult(json);
      await logToSchema(json);
      generateQRCode(json.points);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function generateQRCode(points: number) {
    setGeneratingQR(true);
    try {
      // Взимаме сесията за да пратим user_id при генерирането на QR-а
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/temporary-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_SECURE_API_KEY!,
          // Пращаме Bearer токена за да се запише user_id в QR записа
          ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ points }),
      });

      if (!res.ok) {
        console.error("Failed to generate QR code");
        return;
      }

      const data = await res.json();
      setQrData({
        token: data.token,
        qrUrl: data.qrUrl,
        expiresAt: data.expiresAt,
        points: points,
      });
    } catch (e) {
      console.error("QR generation error:", e);
    } finally {
      setGeneratingQR(false);
    }
  }

  useEffect(() => {
    if (!qrData) return;

    const expirationTime = new Date(qrData.expiresAt).getTime();
    const now = new Date().getTime();
    const timeRemaining = expirationTime - now;

    const timeoutDuration = Math.min(timeRemaining, 5 * 60 * 1000);

    const timer = setTimeout(() => {
      setQrData(null);
      setResult(null);
    }, timeoutDuration);

    return () => clearTimeout(timer);
  }, [qrData]);

  const closeModal = () => {
    setOpen(false);
    setResult(null);
    setError(null);
    setQrData(null);
  };

  return (
    <>
      <div className="w-full h-full">
        <div
          onClick={() => setOpen(true)}
          className="
            w-full h-full group relative overflow-hidden rounded-xl border cursor-pointer
            bg-card border-border hover:border-green-400 hover:shadow-lg hover:shadow-green-200/50
            dark:hover:shadow-green-500/20 transition-all duration-300
            flex flex-col
          "
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-400" />
          <div className="flex-1 p-5 flex flex-col">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex-shrink-0">
                <Camera className="h-6 w-6 text-green-500 group-hover:text-green-600 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">Свободно сканиране</h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
              Сканирайте рециклируеми артикули по всяко време без конкретна
              задача
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

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeModal}
            />

            <div className="relative w-full h-full flex flex-col">
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    <h3 className="text-white font-semibold text-base md:text-lg">
                      Свободно сканиране
                    </h3>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors md:p-2.5"
                    aria-label="Затвори"
                  >
                    <X className="h-5 w-5 md:h-6 md:w-6" />
                  </button>
                </div>
              </div>

              {!result && !error ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6 lg:p-8">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">
                  {loading && (
                    <div className="flex flex-col items-center gap-4">
                      <SpinningRecyclingLoader />
                      <p className="text-white font-medium animate-pulse">
                        Анализиране...
                      </p>
                    </div>
                  )}

                  {result && !loading && (
                    <div className="w-full p-6 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                        <h4 className="text-lg font-semibold text-white text-center">
                          Успешно сканиране!
                        </h4>
                        <div className="flex flex-col items-center gap-2 py-2">
                          {qrData ? (
                            <div className="bg-white p-3 rounded-lg shadow-lg">
                              <QRCodeSVG value={qrData.qrUrl} size={150} />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-white/80">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Генериране на QR...
                            </div>
                          )}
                          <p className="text-sm text-white/80 text-center mt-2">
                            Открит материал:{" "}
                            <span className="font-bold text-white uppercase">
                              {result.material}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={closeModal}
                          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all duration-200"
                        >
                          Затвори
                        </button>
                      </div>
                    </div>
                  )}

                  {error && !loading && (
                    <div className="w-full p-6 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg">
                      <div className="flex flex-col items-center gap-3">
                        <OctagonAlert className="w-12 h-12 text-red-500" />
                        <h4 className="text-lg font-semibold text-white">
                          Сканирането не беше успешно
                        </h4>
                        <p className="text-sm text-white/80 text-center">
                          {error}
                        </p>
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={() => {
                              setError(null);
                              setResult(null);
                            }}
                            className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm"
                          >
                            Нова снимка
                          </button>
                          <button
                            onClick={closeModal}
                            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all duration-200"
                          >
                            Затвори
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!result && !error && !loading && (
                    <button
                      onClick={capture}
                      className="w-full px-6 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-lg md:rounded-xl transition-all duration-200 shadow-lg shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-base md:text-lg overflow-hidden group/btn relative"
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
