"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Scan,
  CameraIcon,
  CheckCircle2,
  X,
  CircleX,
  Sparkles,
  Wind,
  Weight,
  Recycle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  SimpleSpinningRecycling,
  SpinningRecyclingLoader,
} from "../ui/RecyclingLoader";
import { isDev } from "@/lib/isDev";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type MaterialType = "plastic" | "textile" | "textiles" | "metal" | "paper" | "glass" | "organic" | "e-waste" | "ewaste" | "electronics" | "unknown";
type VerifyResult = "YES" | "NO" | null;

interface Props {
  target: string;
  binId: string;
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
  icon, label, value, unit, decimals = 0, border, iconColor,
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
    <div className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 bg-muted/30 border ${border}`}>
      <div className={iconColor}>{icon}</div>
      <div className="text-lg font-bold text-foreground leading-none tabular-nums">
        <CountUp value={value} decimals={decimals} />
        <span className="text-[11px] font-normal ml-0.5 opacity-60">{unit}</span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 text-center leading-tight">{label}</p>
    </div>
  );
}

const materialLabels: Record<MaterialType, string> = {
  plastic: "Пластмаса",
  textile: "Текстил",
  textiles: "Текстил",
  metal: "Метал",
  paper: "Хартия",
  glass: "Стъкло",
  organic: "Органични отпадъци",
  "e-waste": "Електроотпадъци",
  ewaste: "Електроотпадъци",
  electronics: "Електроотпадъци",
  unknown: "Неразпознат",
};

function translateMaterial(raw: string): string {
  const normalized = raw.toLowerCase().trim() as MaterialType;
  return materialLabels[normalized] ?? raw;
}

export default function BinCamera({ target, binId }: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);
  const [loading, setLoading] = useState(false);
  const [itemCount, setItemCount] = useState<number>(0);
  const [co2Saved, setCo2Saved] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [qrData, setQrData] = useState<{ qrUrl: string; expiresAt: string; points: number } | null>(null);

  const showSuccessModal =
    (target && verifyResult === "YES") ||
    (!target && prediction && prediction !== "unknown");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [mounted]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(console.error);
      }
      setCameraOn(true);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const takePhoto = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  };

  const logRecyclingEvent = async (material: string, points: number, count: number, co2: number, weight: number) => {
    try {
      setCo2Saved(Number(co2));
      setWeightKg(weight);
      const res = await fetch("/api/recycling/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, points, count, co2_saved: Number(co2), weight_kg: weight, created_at: new Date().toISOString() }),
      });
      /*if (!res.ok && isDev) console.error("Log error:", await res.json());
      else if (isDev) console.log("Event logged successfully");*/
    } catch (error) {
      console.error("Failed to log recycling event:", error);
    }
  };

  const classifyPhoto = async (image: string) => {
    setLoading(true);
    setPrediction(null); setVerifyResult(null); setQrData(null);
    setItemCount(0); setCo2Saved(0); setWeightKg(0);

    try {
      const endpoint = target ? "/api/gemini-verify-material" : "/api/gemini-classify";
      const requestBody = target ? { image, binId, target } : { image, binId };

      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      if (isDev) console.log("Verification response:", data);

      const detectedCount = data.count || 1;
      const detectedPoints = data.points || 10;
      const detectedWeight = data.weight_kg || 0.1;
      const detectedCo2 = data.co2 || 0.1;

      setItemCount(detectedCount);
      setWeightKg(detectedWeight);
      setCo2Saved(detectedCo2);

      if (target) {
        const result = data.result as VerifyResult;
        setVerifyResult(result);
        if (result === "YES") {
          await generateQR(detectedPoints);
        }
      } else {
        const rawMaterial = data.material as string;
        // Store translated label for display, log original to DB
        const translated = translateMaterial(rawMaterial);
        setPrediction(rawMaterial === "unknown" ? "unknown" : translated);
        if (rawMaterial && rawMaterial !== "unknown") {
          await logRecyclingEvent(rawMaterial, detectedPoints, detectedCount, detectedCo2, detectedWeight);
          await generateQR(detectedPoints);
        }
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setPrediction("unknown");
      if (target) setVerifyResult("NO");
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async (points: number) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { storage: typeof window !== "undefined" ? window.localStorage : undefined, persistSession: true } }
      );
      const { data: { session } } = await supabase.auth.getSession();

      const qrRes = await fetch("/api/temporary-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_SECURE_API_KEY!,
          ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ points, binCode: binId, user_id: binId }),
      });

      const responseData = await qrRes.json();
      if (qrRes.ok && responseData.qrUrl) {
        setQrData({ qrUrl: responseData.qrUrl, expiresAt: responseData.expiresAt, points });
      }
    } catch (error) {
      console.error("Failed to generate QR:", error);
    }
  };

  const handleScanClick = async () => {
    if (loading) return;
    const image = takePhoto();
    if (!image) return;
    await classifyPhoto(image);
  };

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <SpinningRecyclingLoader />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Контейнер за видео */}
      <div className="relative flex-1 w-full bg-black rounded-xl overflow-hidden border border-border shadow-2xl">
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraOn ? "opacity-100" : "opacity-0"}`}
        />

        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-card">
            <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
              <CameraIcon className="w-12 h-12 text-primary/40" />
            </div>
            <p className="text-base text-muted-foreground text-center max-w-xs font-medium">
              {t("binScan.camera.cameraNotAvailable")}
            </p>
          </div>
        )}

        {/* Наслагване при зареждане */}
        {loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-10">
            <div className="bg-card rounded-xl p-10 max-w-md w-full border shadow-lg flex flex-col items-center text-center gap-6">
              <SimpleSpinningRecycling />
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">{t("binScan.camera.analyzing")}</h3>
                <p className="text-sm text-muted-foreground">
                  {target ? t("binScan.camera.verifying") : t("binScan.camera.recognizing")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Модал за успех */}
        {showSuccessModal && !loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="relative bg-card rounded-2xl p-8 max-w-md w-full border shadow-lg">
              <button
                onClick={() => { setVerifyResult(null); setPrediction(null); setQrData(null); }}
                className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center gap-5">
                {/* Заглавие */}
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <h3 className="text-2xl font-bold">
                    {target ? t("binScan.results.correctContainer") : prediction}
                  </h3>
                </div>

                {/* Статистически табелки */}
                <div className="flex gap-2 w-full">
                  <StatPill
                    icon={<Recycle className="w-4 h-4" />}
                    label={t("binScan.results.stats.count")}
                    value={itemCount}
                    unit={t("binScan.results.units.pieces")}
                    border="border-green-500/20"
                    iconColor="text-green-500"
                  />
                  {weightKg > 0 && (
                    <StatPill
                      icon={<Weight className="w-4 h-4" />}
                      label={t("binScan.results.stats.weight")}
                      value={weightKg}
                      unit={t("binScan.results.units.kg")}
                      decimals={2}
                      border="border-sky-500/20"
                      iconColor="text-sky-500"
                    />
                  )}
                  {co2Saved > 0 && (
                    <StatPill
                      icon={<Wind className="w-4 h-4" />}
                      label={t("binScan.results.stats.co2Saved")}
                      value={co2Saved}
                      unit={t("binScan.results.units.kg")}
                      decimals={2}
                      border="border-emerald-500/20"
                      iconColor="text-emerald-500"
                    />
                  )}
                  {(qrData?.points ?? 0) > 0 && (
                    <StatPill
                      icon={<Sparkles className="w-4 h-4" />}
                      label={t("binScan.results.stats.points")}
                      value={qrData?.points ?? 0}
                      unit={t("binScan.results.units.points")}
                      border="border-amber-500/20"
                      iconColor="text-amber-500"
                    />
                  )}
                </div>

                {/* QR секция */}
                {qrData ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                      <QRCodeSVG value={qrData.qrUrl} size={180} fgColor="#00CD56" bgColor="transparent" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t("binScan.results.scan")}</p>
                    <p className="text-xs text-muted-foreground/60 -mt-1">{t("binScan.results.or")}</p>
                    <a href={qrData.qrUrl} className="text-sm font-semibold text-green-500 hover:text-green-400 transition-colors -mt-1">
                      {t("binScan.results.claimHere")}
                    </a>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {t("binScan.results.validUntil")}{" "}
                      {new Date(qrData.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                      <SpinningRecyclingLoader />
                    </div>
                    <p className="text-base text-muted-foreground">{t("binScan.results.generating")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Модал за грешен контейнер */}
        {verifyResult === "NO" && !loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="relative bg-card rounded-2xl p-10 max-w-md w-full border shadow-lg">
              <button
                onClick={() => setVerifyResult(null)}
                className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-3">
                  <CircleX className="w-9 h-9 text-red-500" />
                  <h3 className="text-3xl font-semibold text-red-500">{t("binScan.results.wrongContainer")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{t("binScan.results.wrongContainerMessage")}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Бутон за сканиране */}
      <div className="flex-shrink-0">
        {!cameraOn ? (
          <button
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg"
          >
            <CameraIcon className="w-5 h-5" />
            <span>{t("binScan.camera.enableCameraBtn")}</span>
          </button>
        ) : (
          <button
            onClick={handleScanClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-accent disabled:text-foreground/40 text-primary-foreground font-medium px-6 py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg disabled:cursor-not-allowed"
          >
            {loading ? (
              <><SimpleSpinningRecycling /><span>{t("binScan.camera.scanning")}</span></>
            ) : (
              <><Scan className="w-5 h-5" /><span>{target ? t("binScan.camera.confirmBtn") : t("binScan.camera.recognizeBtn")}</span></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}