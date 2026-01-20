"use client";

import { useRef, useState, useEffect } from "react";
import { Scan, CameraIcon, Loader2, CheckCircle2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type MaterialType = "plastic" | "textile" | "metal" | "paper" | "glass" | "unknown";
type VerifyResult = "YES" | "NO" | null;

interface Props {
  target: string; // Целеви материал за проверка
  binId: string;  // ID на контейнера/бина
}

export default function BinCamera({ target, binId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);          // Статус на камерата
  const [prediction, setPrediction] = useState<MaterialType | null>(null); // Открит материал
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);   // Резултат от проверка (YES/NO)
  const [loading, setLoading] = useState(false);            // Индикатор за зареждане
  const [qrToken, setQrToken] = useState<string | null>(null); // Генериран QR токен

  // Стартиране на камерата при първоначално зареждане
  useEffect(() => {
    startCamera();
    return () => {
      // Спиране на камерата при излизане от компонента
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Функция за стартиране на камерата
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

  // Взима снимка от видео потока
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

  // Класифицира снимката чрез API и генерира QR код при успешен резултат
  const classifyPhoto = async (image: string) => {
    setLoading(true);
    setPrediction(null);
    setVerifyResult(null);
    setQrToken(null);

    try {
      if (!process.env.SECURE_API_KEY) {
        throw new Error("API key not configured");
      }
      const res = await fetch("/api/gemini-classify", {
        method: "POST",
        headers: { 
          "x-api-key": process.env.SECURE_API_KEY,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ binId, image, target }),
      });

      const data = await res.json();

      // Ако API върне грешка
      if (!res.ok || (!data.material && !data.result)) {
        console.error("API error:", res.status, data);
        setPrediction("unknown");
        setVerifyResult(target ? "NO" : null);
        return;
      }

      // Проверка за целеви материал
      if (target) {
        setVerifyResult(data.result);

        // Генериране на QR код при успешна проверка
        if (data.result === "YES") {
          const qrRes = await fetch("/api/temporary-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: 10, binCode: binId }),
          });
          const qrData = await qrRes.json();
          if (qrRes.ok && qrData.token) setQrToken(qrData.token);
        }
      } else {
        // Класификация на материал
        setPrediction(data.material as MaterialType);

        // Генериране на QR код за разпознат материал
        if (data.material && data.material !== "unknown") {
          const qrRes = await fetch("/api/temporary-qr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: 10, binCode: binId }),
          });
          const qrData = await qrRes.json();
          if (qrRes.ok && qrData.token) setQrToken(qrData.token);
        }
      }
    } catch (err) {
      console.error("Classification failed:", err);
      setPrediction("unknown");
      setVerifyResult(target ? "NO" : null);
    } finally {
      setLoading(false);
    }
  };

  // Обработва натискането на бутона за сканиране
  const handleScanClick = async () => {
    if (loading) return;
    const image = takePhoto();
    if (!image) return;
    await classifyPhoto(image);
  };

  // Локализирани етикети за материали
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
        {/* Инструкции при изключена камера */}
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

        {/* Overlay за правилен контейнер с QR код */}
        {verifyResult === "YES" && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6">
            <div className="relative flex flex-col items-center gap-4 p-6">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-18 h-18 text-success" />
              </div>
              <p className="text-xl md:text-4xl font-semibold text-success text-center">
                Правилен контейнер
              </p>

              {/* QR код за сканиране */}
              {qrToken && (
                <div className="mt-4 flex flex-col gap-2 items-center justify-center">
                  <QRCodeSVG 
                    value={qrToken} 
                    size={180} 
                    fgColor="#00CD56"
                    bgColor="transparent"
                  />
                  <p className="text-md text-neutral-500 text-center">Скранирай, за да получиш точки!</p>
                </div>
              )}

              {/* X иконка за затваряне на overlay */}
              <X
                className="absolute top-4 right-4 w-6 h-6 cursor-pointer text-foreground/70 hover:text-foreground/100"
                onClick={() => {
                  setVerifyResult(null);
                  setQrToken(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Popup за показване на разпознат материал */}
        {!target && prediction && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-6">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border">
              <p className="text-sm text-foreground/60 mb-1">Открит материал</p>
              <p className="text-2xl font-bold text-primary">{materialLabels[prediction]}</p>
            </div>
          </div>
        )}
      </div>

      {/* Контролни бутони */}
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
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Сканиране...</span>
              </>
            ) : (
              <>
                <Scan className="w-5 h-5" />
                <span>Заснеми и анализирай</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}