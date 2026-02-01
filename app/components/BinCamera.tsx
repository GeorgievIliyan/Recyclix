"use client";

import { useRef, useState, useEffect } from "react";
import { Scan, CameraIcon, Loader2, CheckCircle2, X, CircleX } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SimpleSpinningRecycling } from "./RecyclingLoader";
import { isDev } from "@/lib/isDev";

// типове
type MaterialType = "plastic" | "textile" | "metal" | "paper" | "glass" | "unknown";
type VerifyResult = "YES" | "NO" | null;

interface Props {
  target: string; // Целеви материал за проверка
  binId: string;  // ID на контейнера/бина
}

export default function BinCamera({ target, binId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [prediction, setPrediction] = useState<MaterialType | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{qrUrl: string; expiresAt: string} | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
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

  const classifyPhoto = async (image: string) => {
    setLoading(true);
    setPrediction(null);
    setVerifyResult(null);
    setQrData(null);

    try {
      let endpoint: string;
      let requestBody: any;
      
      if (target) {
        endpoint = "/api/gemini-verify-material";
        requestBody = {
          image: image,
          binId: binId,
          target: target
        };
      } else {
        endpoint = "/api/gemini-classify";
        requestBody = {
          image: image,
          binId: binId
        };
      }
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ API error ${res.status}:`, errorText);
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      if (isDev){
        console.log("Verification response:", data);
      }

      if (target) {
        const result = data.result as VerifyResult;
        setVerifyResult(result);

        if (result === "YES") {
          await generateQR();
        }
      } else {
        const material = data.material as MaterialType;
        setPrediction(material);

        if (material && material !== "unknown") {
          await generateQR();
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

  const generateQR = async () => {
    try {
      const qrRes = await fetch("/api/temporary-qr", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          points: 10, 
          binCode: binId
        }),
      });
      
      const responseData = await qrRes.json();
      if (isDev){
        console.log("QR API Response:", responseData);
      }
      
      if (qrRes.ok && responseData.qrUrl) {
        if (isDev){
          console.log("✅ QR URL received:", responseData.qrUrl);
        }
        setQrData({
          qrUrl: responseData.qrUrl,
          expiresAt: responseData.expiresAt
        });
      } else {
        console.error("QR API error:", responseData);
      }
    } catch (error) {
      console.error("Failed to generate QR:", error);
    }
  };

  const handleScanClick = async () => {
    if (loading) return;
    const image = takePhoto();
    if (!image) {
      console.log("No image captured");
      return;
    }
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
              Активирайте камерата за сканиране и автоматично разпознаване на материали
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-card rounded-xl p-10 max-w-md w-full border shadow-lg">
              <div className="flex flex-col items-center text-center gap-6">
                <SimpleSpinningRecycling />
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">Анализиране...</h3>
                  <p className="text-sm text-muted-foreground">
                    {target ? "Проверяваме материала..." : "Разпознаваме материала..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {verifyResult === "YES" && !loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-card rounded-xl p-10 max-w-md w-full border shadow-lg">
              
              <button
                onClick={() => {
                  setVerifyResult(null);
                  setQrData(null);
                }}
                className="absolute top-4 right-4 text-foreground/70 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6 dark:text-neutral-600" />
              </button>

              <div className="flex flex-col items-center text-center gap-8">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <h3 className="text-3xl font-semibold">Правилен контейнер</h3>
                </div>

                {/* QR код */}
                {qrData ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                      <QRCodeSVG 
                        value={qrData.qrUrl}
                        size={200}
                        fgColor="#00CD56"
                        bgColor="transparent"
                      />
                    </div>
                    <p className="text-base text-muted-foreground dark:text-neutral-600">
                      Сканирай, за да получиш точки
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Валиден до: {new Date(qrData.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                      <SimpleSpinningRecycling />
                    </div>
                    <p className="text-base text-muted-foreground">
                      Генериране на QR код...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {verifyResult === "NO" && !loading && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
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
                  <h3 className="text-3xl font-semibold text-red-500">Грешен контейнер</h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  Този обект не принадлежи към категорията!
                </p>

                <p className="text-lg mt-3">
                  Опитайте с друг контейнер или се уверете, че снимката е ясна!
                </p>
              </div>
            </div>
          </div>
        )}

        {!target && prediction && !loading && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-6">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border">
              <p className="text-sm text-foreground/60 mb-1">Открит материал</p>
              <p className="text-2xl font-bold text-primary">{materialLabels[prediction]}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
        {!cameraOn ? (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            <CameraIcon className="w-5 h-5" />
            <span>Включи камера</span>
          </button>
        ) : (
          <button
            onClick={handleScanClick}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-accent disabled:text-foreground/40 text-primary-foreground font-medium px-6 py-4 rounded-lg transition-all active:scale-[0.98] shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <>
                <SimpleSpinningRecycling />
                <span>Сканиране...</span>
              </>
            ) : (
              <>
                <Scan className="w-5 h-5" />
                <span>{target ? "Потвърди материал" : "Разпознай материал"}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}