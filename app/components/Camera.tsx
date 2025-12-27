"use client"

import { useRef, useState, useEffect } from "react"
import { Scan, CameraIcon, Loader2, CheckCircle2, XCircle } from "lucide-react"

// Типове за разпознат материал и резултат от проверка
type MaterialType = "plastic" | "textile" | "metal" | "paper" | "glass" | "unknown"
type VerifyResult = "YES" | "NO" | null

interface Props {
  target: string // Очакван материал (ако има)
}

function Camera({ target }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Състояния
  const [cameraOn, setCameraOn] = useState(false)
  const [prediction, setPrediction] = useState<MaterialType | null>(null)
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<boolean | null>(null)

  // Спира камерата и освобождава ресурсите
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraOn(false)
  }

  // Cleanup при размонтиране на компонента
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  /* ================= КАМЕРА ================= */
  const startCamera = async () => {
    if (cameraOn) return

    setCameraError(null)

    try {
      // Спиране на предишен stream (ако има)
      stopCamera()

      // Малко изчакване за освобождаване на устройството
      await new Promise(resolve => setTimeout(resolve, 100))

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraOn(true)
      }
    } catch (err: any) {
      console.error("Camera error:", err)

      // Човешки разбираеми грешки
      if (err.name === "NotAllowedError") {
        setCameraError("Достъпът до камерата е отказан.")
      } else if (err.name === "NotFoundError") {
        setCameraError("Не е намерена камера.")
      } else if (err.name === "NotReadableError" || err.name === "OverconstrainedError") {
        setCameraError("Камерата се използва от друго приложение.")
      } else {
        setCameraError("Грешка при достъп до камерата.")
      }

      stopCamera()
    }
  }

  // Включване / изключване на камерата
  const toggleCamera = () => {
    cameraOn ? stopCamera() : startCamera()
  }

  /* ================= СНИМКА ================= */
  // Заснема кадър от видеото и го връща като base64
  const takePhoto = (): string | null => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.6)
  }

  /* ================= GEMINI ================= */
  // Изпраща снимката към API за разпознаване
  const classifyPhoto = async () => {
    if (loading) return

    setPrediction(null)
    setVerifyResult(null)
    setScanResult(null)

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
        setPrediction("unknown")
        setScanResult(true)
        return
      }

      const data = await res.json()

      // Ако има target – проверяваме дали съвпада
      if (target) {
        const result: VerifyResult = data.result === "YES" ? "YES" : "NO"
        setVerifyResult(result)
        setScanResult(true)

        setTimeout(() => {
          setScanResult(false)
          setVerifyResult(null)
        }, 5000)

        return
      }

      // Класификация на материал
      setPrediction(
        ["plastic", "metal", "glass", "paper", "textile"].includes(data.material)
          ? data.material
          : "unknown",
      )

      setScanResult(true)

      setTimeout(() => {
        setScanResult(false)
        setVerifyResult(null)
      }, 5000)
    } catch (err) {
      console.error("Gemini error:", err)
      setPrediction("unknown")
      setScanResult(true)
    } finally {
      setLoading(false)
    }
  }

  /* ================= ИНТЕРФЕЙС ================= */
  // Етикети на материалите на български
  const materialLabels: Record<MaterialType, string> = {
    plastic: "Пластмаса",
    textile: "Текстил",
    metal: "Метал",
    paper: "Хартия",
    glass: "Стъкло",
    unknown: "Неразпознат",
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            cameraOn ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Празен екран преди стартиране */}
        {!cameraOn && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-card">
            <CameraIcon className="w-12 h-12 text-primary/40" />
            <p className="text-muted-foreground">Активирайте камерата</p>
          </div>
        )}

        {/* Грешка от камерата */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <p className="text-destructive text-center">{cameraError}</p>
          </div>
        )}

        {/* Резултат от проверка */}
        {verifyResult && scanResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95">
            {verifyResult === "YES" ? (
              <p className="text-green-500 font-semibold">Успешно сканиране</p>
            ) : (
              <p className="text-red-600 font-semibold">Грешен контейнер</p>
            )}
          </div>
        )}

        {/* Показване на разпознат материал */}
        {!target && prediction && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/90">
            <p className="text-sm text-muted-foreground">Открит материал</p>
            <p className="text-xl font-bold">{materialLabels[prediction]}</p>
          </div>
        )}
      </div>

      {/* Контроли */}
      <div className="flex gap-3">
        {!cameraOn ? (
          <button onClick={startCamera}>
            <CameraIcon /> Включи камера
          </button>
        ) : (
          <>
            <button onClick={toggleCamera}>Изключи камера</button>
            <button onClick={classifyPhoto} disabled={loading}>
              {loading ? "Сканиране..." : "Анализирай"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Camera