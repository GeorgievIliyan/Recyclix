"use client"

import { Camera, CheckCircle2, OctagonAlert } from "lucide-react"
import { useRef, useState, useEffect } from "react"

interface ConfirmCameraProps {
  userDailyTaskId: string
  onConfirm: (success: boolean) => void
  inlineMode?: boolean
}

export default function ConfirmCamera({ userDailyTaskId, onConfirm, inlineMode = false }: ConfirmCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [apiResult, setApiResult] = useState<{
    success: boolean
    result: string
    taskTitle?: string
    taskDescription?: string
    error?: string
  } | null>(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      // спиране на предишен стрийм
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        setStream(null)
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      })
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
      setError(null)
      setApiResult(null)
      setIsCameraActive(true)
    } catch (err: any) {
      setError("Грешка с камерата: " + err.message)
      setIsCameraActive(false)
    }
  }

  const takePhoto = () => {
    if (!videoRef.current) return
    
    try {
      const canvas = document.createElement("canvas")
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        setError("Грешка при създаване на контекст")
        return
      }
      
      // огледанлно обръщане
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const base64Image = canvas.toDataURL("image/jpeg", 0.85)
      setImage(base64Image)
      
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        setStream(null)
      }
      setIsCameraActive(false)
      setApiResult(null)
    } catch (err: any) {
      setError("Грешка при заснемане: " + err.message)
    }
  }

  const confirmTask = async () => {
    if (!image) {
      setError("Моля, направете снимка първо")
      return
    }
    
    setLoading(true)
    setError(null)
    setApiResult(null)
    
    try {
      console.log("ConfirmCamera: Sending image to confirm API for task:", userDailyTaskId)
      
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          userDailyTaskId, 
          image 
        }),
      })
      
      const data = await res.json()
      console.log("ConfirmCamera: API response:", data)
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to verify image`)
      }
      
      setApiResult({
        success: data.success,
        result: data.result,
        taskTitle: data.taskTitle,
        taskDescription: data.taskDescription,
        error: data.error
      })
    } catch (err: any) {
      console.error("ConfirmCamera: Error:", err)
      setError("Грешка при потвърждение: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const retakePhoto = () => {
    setImage(null)
    setError(null)
    setApiResult(null)
    startCamera()
  }

  const closeCamera = () => {
    if (apiResult?.success) {
      onConfirm(true)
    } else {
      onConfirm(false)
    }
  }

  useEffect(() => {
    if (inlineMode) {
      startCamera()
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [inlineMode])

  // Редови изглед
  if (inlineMode) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden bg-black border border-border">
          {!image ? (
            <div className="relative aspect-[4/3] max-h-48">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center p-4">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Камерата не е активна</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative aspect-[4/3] max-h-48">
              <img src={image || "/placeholder.svg"} alt="Заснета снимка" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* При успех */}
        {apiResult?.success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="flex-1 ml-1">
                <h4 className="text-sm font-semibold text-green-500 flex gap-1">
                  <CheckCircle2 className="text-green-500 h-5 w-5"/>
                  Успешна верификация!
                </h4>
                <p className="text-xs text-green-500 mt-1">
                  Снимката съответства на задачата "{apiResult.taskTitle}"
                </p>
              </div>
              <button
                  onClick={closeCamera}
                  className="mt-1 w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-all duration-200"
                >
                  Затвори
                </button>
            </div>
          </div>
        )}

        {/* При неуспех */}
        {apiResult && !apiResult.success && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-500 flex gap-1"><OctagonAlert className="text-red-500 h-5 w-5"/>Верификация неуспешна</h4>
                <p className="text-xs text-red-500 mt-2">
                  {apiResult.error && (
                    <span className="block mt-1">{apiResult.error}</span>
                  )}
                  {!apiResult.error && (
                    <span className="block mt-1">Снимката не съответства на задачата. Опитайте отново.</span>
                  )}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={retakePhoto}
                    className="flex-1 px-4 py-2 bg-white hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-all duration-200"
                  >
                    Нова снимка
                  </button>
                  <button
                    onClick={closeCamera}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-200"
                  >
                    Затвори
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* контрол на камерата */}
        {!apiResult && (
          <div className="space-y-2">
            {!image ? (
              <div className="space-y-2">
                <button
                  onClick={takePhoto}
                  disabled={!isCameraActive}
                  className="w-full px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4"/>
                  Заснеми
                </button>
                {!isCameraActive && (
                  <button
                    onClick={startCamera}
                    className="w-full px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Стартирай камера
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={retakePhoto}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-muted hover:bg-neutral-200 text-foreground text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Отново
                </button>
                <button
                  onClick={confirmTask}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#00CD56] hover:bg-[#00B84C] text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Обработка...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Потвърди
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {error && !apiResult && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center">
      <button
        onClick={startCamera}
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