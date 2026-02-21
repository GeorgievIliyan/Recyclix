"use client";

import { useRef, useState, useEffect } from "react";
import {
  Scan,
  CameraIcon,
  CheckCircle2,
  X,
  CircleX,
  Hash,
  Sparkles,
  Leaf,
  Weight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  SimpleSpinningRecycling,
  SpinningRecyclingLoader,
} from "./RecyclingLoader";
import { isDev } from "@/lib/isDev";
import { useRouter } from "next/navigation";

// типове
type MaterialType =
  | "plastic"
  | "textile"
  | "metal"
  | "paper"
  | "glass"
  | "unknown";
type VerifyResult = "YES" | "NO" | null;

interface Props {
  target: string; // Целеви материал за проверка
  binId: string; // ID на контейнера/бина
}

export default function BinCamera({ target, binId }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [prediction, setPrediction] = useState<MaterialType | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);
  const [loading, setLoading] = useState(false);
  const [itemCount, setItemCount] = useState<number>(0);
  const [co2Saved, setCo2Saved] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [qrData, setQrData] = useState<{
    qrUrl: string;
    expiresAt: string;
    points: number;
  } | null>(null);

  const showSuccessModal =
    (target && verifyResult === "YES") ||
    (!target && prediction && prediction !== "unknown");

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () =>
          videoRef.current?.play().catch(console.error);
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

  const logRecyclingEvent = async (
    material: string,
    points: number,
    count: number,
    co2: number,
    weight: number,
  ) => {
    try {
      const calculatedCo2 = Number(co2);
      setCo2Saved(Number(co2));
      setWeightKg(weight);

      const res = await fetch("/api/recycling/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material: material,
          points: points,
          count: count,
          co2_saved: calculatedCo2,
          weight_kg: weight,
          created_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Log error:", errorData);
        return;
      }

      if (isDev) console.log("Event logged successfully");
    } catch (error) {
      console.error("Failed to log recycling event:", error);
    }
  };

  const classifyPhoto = async (image: string) => {
    setLoading(true);
    setPrediction(null);
    setVerifyResult(null);
    setQrData(null);
    setItemCount(0);
    setCo2Saved(0);
    setWeightKg(0);

    try {
      let endpoint: string;
      let requestBody: any;

      if (target) {
        endpoint = "/api/gemini-verify-material";
        requestBody = { image, binId, target };
      } else {
        endpoint = "/api/gemini-classify";
        requestBody = { image, binId };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      if (isDev) console.log("Verification response:", data);

      const detectedCount = data.count || 1;
      const detectedPoints = data.points || 10;
      const detectedWeight = data.weight_kg || 0.1;
      const detectedCo2 = data.co2 || 0.1;

      setItemCount(detectedCount);
      setWeightKg(detectedWeight);

      if (target) {
        const result = data.result as VerifyResult;
        setVerifyResult(result);

        if (result === "YES") {
          await logRecyclingEvent(
            target,
            detectedPoints,
            detectedCount,
            detectedCo2,
            detectedWeight,
          );
          await generateQR(detectedPoints);
        }
      } else {
        const material = data.material as MaterialType;
        setPrediction(material);

        if (material && material !== "unknown") {
          await logRecyclingEvent(
            material,
            detectedPoints,
            detectedCount,
            detectedCo2,
            detectedWeight,
          );
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
      const qrRes = await fetch("/api/temporary-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_SECURE_API_KEY!,
        },
        body: JSON.stringify({
          points: points,
          binCode: binId,
        }),
      });

      const responseData = await qrRes.json();

      if (qrRes.ok && responseData.qrUrl) {
        setQrData({
          qrUrl: responseData.qrUrl,
          expiresAt: responseData.expiresAt,
          points: points,
        });
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

  const materialLabels: Record<MaterialType, string> = {
    plastic: "Пластмаса",
    textile: "Текстил",
    metal: "Метал",
    paper: "Хартия",
    glass: "Стъкло",
    unknown: "Неразпознат",
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Видео контейнер */}
      <div className="relative flex-1 w-full bg-black rounded-xl overflow-hidden border border-border shadow-2xl group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            cameraOn ? "opacity-100" : "opacity-0"
          }`}
        />

        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-card">
            <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
              <CameraIcon className="w-12 h-12 text-primary/40" />
            </div>
            <p className="text-base text-muted-foreground text-center max-w-xs font-medium">
              Активирайте камерата за сканиране и автоматично разпознаване
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-10">
            <div className="relative bg-card rounded-xl p-10 max-w-md w-full border shadow-lg">
              <div className="flex flex-col items-center text-center gap-6">
                <SimpleSpinningRecycling />
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">Анализиране...</h3>
                  <p className="text-sm text-muted-foreground">
                    {target
                      ? "Проверяваме материала..."
                      : "Разпознаваме материала..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* модал при успех */}
        {showSuccessModal && !loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="relative bg-card rounded-xl p-8 max-w-md w-full border shadow-lg">
              <button
                onClick={() => {
                  setVerifyResult(null);
                  setPrediction(null);
                  setQrData(null);
                }}
                className="absolute top-4 right-4 text-foreground/70 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6 dark:text-neutral-600" />
              </button>

              <div className="flex flex-col items-center text-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <h3 className="text-4xl font-bold">
                    {target
                      ? "Правилен контейнер"
                      : materialLabels[prediction!]}
                  </h3>
                </div>

                {/* секция със статистики */}
                <div className="flex flex-wrap gap-2 w-full justify-center">
                  <div className="bg-primary/10 px-3 py-2 rounded-lg flex items-center gap-2 border border-primary/20">
                    <Hash className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {itemCount} бр.
                    </span>
                  </div>
                  <div className="bg-amber-500/10 px-3 py-2 rounded-lg flex items-center gap-2 border border-amber-500/20">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600">
                      +{qrData?.points || 0} т.
                    </span>
                  </div>
                  {/* Тегло на боклука */}
                  <div className="bg-blue-500/10 px-3 py-2 rounded-lg flex items-center gap-2 border border-blue-500/20">
                    <Weight className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-blue-600">
                      {weightKg} кг.
                    </span>
                  </div>
                  {/* CO2 */}
                  <div className="bg-emerald-500/10 px-3 py-2 rounded-lg flex items-center gap-2 border border-emerald-500/20">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-600">
                      {co2Saved} кг. CO₂
                    </span>
                  </div>
                </div>

                {qrData ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                      <QRCodeSVG
                        value={qrData.qrUrl}
                        size={180}
                        fgColor="#00CD56"
                        bgColor="transparent"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-neutral-400">
                      Сканирай за точки
                    </p>
                    <p className="text-xs text-muted-foreground/60 -mt-1">
                      или
                    </p>
                    <a
                      href={qrData.qrUrl}
                      className="hover:text-green-500 -mt-1"
                    >
                      Вземи тук
                    </a>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Валиден до:{" "}
                      {new Date(qrData.expiresAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                      <SpinningRecyclingLoader />
                    </div>
                    <p className="text-base text-muted-foreground">
                      Генериране на награда...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {verifyResult === "NO" && !loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="relative bg-card rounded-xl p-10 max-w-md w-full border shadow-lg">
              <button
                onClick={() => setVerifyResult(null)}
                className="absolute top-4 right-4 text-foreground/70 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6 dark:text-neutral-600" />
              </button>

              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-3">
                  <CircleX className="w-9 h-9 text-red-500" />
                  <h3 className="text-3xl font-semibold text-red-500">
                    Грешен контейнер
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Този обект не принадлежи към категорията!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
        {!cameraOn ? (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg"
          >
            <CameraIcon className="w-5 h-5" />
            <span>Включи камера</span>
          </button>
        ) : (
          <button
            onClick={handleScanClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-accent disabled:text-foreground/40 text-primary-foreground font-medium px-6 py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <SimpleSpinningRecycling />
                <span>Сканиране...</span>
              </>
            ) : (
              <>
                <Scan className="w-5 h-5" />
                <span>{target ? "Потвърди" : "Разпознай"}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
