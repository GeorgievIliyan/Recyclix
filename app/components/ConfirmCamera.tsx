"use client"

import { useRef, useState, useEffect } from "react"

interface ConfirmCameraProps {
  userDailyTaskId: string
  onConfirm: (success: boolean) => void
}

export default function ConfirmCamera({ userDailyTaskId, onConfirm }: ConfirmCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [stream])

  const startCamera = async () => {
    try {
      stream?.getTracks().forEach((t) => t.stop())
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      setStream(newStream)
      if (videoRef.current) videoRef.current.srcObject = newStream
      setError(null)
    } catch (err: any) {
      setError("Camera error: " + err.message)
    }
  }

  const takePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement("canvas")
    let width = videoRef.current.videoWidth
    let height = videoRef.current.videoHeight
    const maxW = 1920,
      maxH = 1080
    if (width > maxW) {
      height = (height * maxW) / width
      width = maxW
    }
    if (height > maxH) {
      width = (width * maxH) / height
      height = maxH
    }
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoRef.current, 0, 0, width, height)
    setImage(canvas.toDataURL("image/jpeg", 0.85))
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  const confirmTask = async () => {
    if (!image) {
      setError("Take a photo first")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/gemini-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userDailyTaskId, image }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Confirmation failed")
      data.result === "YES" ? onConfirm(true) : (setError("Verification failed"), onConfirm(false))
    } catch (err: any) {
      setError(err.message || "Unexpected error")
      onConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const retakePhoto = () => {
    setImage(null)
    startCamera()
  }

  const handleOpenCamera = () => {
    setIsCameraOpen(true)
    startCamera()
  }

  const handleCloseCamera = () => {
    setIsCameraOpen(false)
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setImage(null)
    setError(null)
  }

  if (!isCameraOpen) {
    return (
      <div className="flex items-center justify-center">
        <button
          onClick={handleOpenCamera}
          className="group relative w-full px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Отвори камера
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Заглавна лента */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00CD56] animate-pulse" />
            <h3 className="text-base font-semibold text-foreground">Потвърждаване</h3>
          </div>
          <button
            onClick={handleCloseCamera}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            aria-label="Затвори камера"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Камера/Снимка контейнер */}
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden bg-black shadow-xl border border-border">
            {!image ? (
              <div className="relative aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {/* Overlay grid за визуален ефект */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-3 border-2 border-white/20 rounded-lg" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                </div>
              </div>
            ) : (
              <div className="relative aspect-[4/3]">
                <img src={image || "/placeholder.svg"} alt="Заснета снимка" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Контроли */}
          <div className="mt-4 space-y-2">
            {!image ? (
              <div className="flex gap-2">
                <button
                  onClick={startCamera}
                  disabled={!!stream}
                  className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Стартирай
                  </span>
                </button>
                <button
                  onClick={takePhoto}
                  disabled={!stream}
                  className="flex-1 px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-md"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                    </svg>
                    Заснеми
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={retakePhoto}
                  className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Отново
                  </span>
                </button>
                <button
                  onClick={confirmTask}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Обработка...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Потвърди
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Съобщения за грешки */}
          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
