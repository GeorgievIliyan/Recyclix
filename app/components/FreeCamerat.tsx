"use client"

import { useRef, useState, useEffect } from "react"
import { Scan, CameraIcon, Loader2, CheckCircle2, XCircle } from "lucide-react"

// Типове материали за разпознаване
type MaterialType = "plastic" | "textile" | "metal" | "paper" | "glass" | "ewaste" | "unknown"

// Резултат от проверка спрямо целеви материал
type VerifyResult = "YES" | "NO" | null

function FreeCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Състояния на компонента
  const [cameraOn, setCameraOn] = useState(false) // камерата е включена/изключена
  const [prediction, setPrediction] = useState<MaterialType | null>(null) // предсказан материал
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null) // резултат от проверка на целевия материал
  const [loading, setLoading] = useState(false) // индикатор за зареждане

  // Стартиране на камерата при монтаж на компонента
  useEffect(() => {
    startCamera()

    // Почистване на стрийма при демонтиране
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  /* ================= КАМЕРА ================= */

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "euser", // използва предната камера
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false, // без звук
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.error("[v0] Play error:", e))
        }
      }

      setCameraOn(true) // камерата е активна
    } catch (err) {
      console.error("Camera error:", err)
    }
  }

  /* ================= СНИМКА ================= */

  const takePhoto = (): string | null => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Копиране на кадъра от видеото върху canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.6) // компресиран JPEG
  }

  /* ================= GEMINI API ================= */

  const classifyPhoto = async () => {
    if (loading) return // предотвратява дублиране на заявки

    setPrediction(null)
    setVerifyResult(null)

    const image = takePhoto()
    if (!image) return

    setLoading(true)

    try {
      const res = await fetch("/api/gemini-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          target: target || undefined,
        }),
      })

      if (!res.ok) {
        setPrediction("unknown") // при грешка връща неизвестен материал
        return
      }

      const data = await res.json()

      // 🔁 РЕЖИМ НА ВЕРИФИКАЦИЯ (има target)
      if (target) {
        setVerifyResult(data.result === "YES" ? "YES" : "NO")
        return
      }

      // 🔁 РЕЖИМ НА КЛАСИФИКАЦИЯ (няма target)
      setPrediction(
        ["plastic", "metal", "glass", "paper", "textile"].includes(data.material) ? data.material : "unknown",
      )
    } catch (err) {
      console.error("Gemini error:", err)
      setPrediction("unknown")
    } finally {
      setLoading(false)
    }
  }

  /* ================= ИНТЕРФЕЙС ================= */

  // Мапинг на материали към български текст
  const materialLabels: Record<MaterialType, string> = {
    plastic: "Пластмаса",
    textile: "Текстил",
    metal: "Метал",
    paper: "Хартия",
    glass: "Стъкло",
    ewaste: "",
    unknown: "Неразпознат"
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Видео контейнер */}
      <div className="relative flex-1 w-full bg-black rounded-xl overflow-hidden border border-border shadow-2xl group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraOn ? "opacity-100" : "opacity-0"}`}
        />

        {/* Съобщение при изключена камера */}
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

        {/* Overlay за резултат от верификация */}
        {verifyResult && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 p-6">
              {verifyResult === "YES" ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </div>
                  <p className="text-xl md:text-2xl font-semibold text-success text-center">Правилен контейнер</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-error/20 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-error" />
                  </div>
                  <p className="text-xl md:text-2xl font-semibold text-error text-center">Грешен контейнер</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Overlay за класификация */}
        {!target && prediction && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-6">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-4 border border-border">
              <p className="text-sm text-foreground/60 mb-1">Открит материал</p>
              <p className="text-2xl font-bold text-primary">{materialLabels[prediction]}</p>
            </div>
          </div>
        )}
      </div>

      {/* Контроли за камера/сканиране */}
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
            onClick={classifyPhoto}
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
  )
}

export default FreeCamera