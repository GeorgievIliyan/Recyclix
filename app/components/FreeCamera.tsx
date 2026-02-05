'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, Loader2, CheckCircle2, AlertCircle, Leaf, Hash, Sparkles } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

type ScanResult = {
  material?: string
  count: number
  points: number
  co2?: number
  error?: string
}

type QRData = {
  token: string
  qrUrl: string
  expiresAt: string
  points: number
}

export function FreeCamera({ task }: { task: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [generatingQR, setGeneratingQR] = useState(false)

  // стартиране на камера
  useEffect(() => {
    if (!open) return

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
      .catch(() => setError('Camera access denied'))

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [open])

  // изпращане до ai
  async function capture() {
    if (!videoRef.current || !canvasRef.current) return
    setLoading(true)
    setError(null)
    setResult(null)
    setQrData(null)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataURL = canvas.toDataURL('image/jpeg', 0.8)

    try {
      const res = await fetch('/api/free-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL, task }),
      })

      const json: ScanResult = await res.json()
      if (!res.ok) {
        setError(json.error || 'Scan failed')
      } else {
        setResult(json)
        generateQRCode(json.points)
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  async function generateQRCode(points: number) {
    setGeneratingQR(true)
    try {
      const res = await fetch('/api/temporary-qr', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-token': process.env.NEXT_PUBLIC_SECURE_API_KEY || ''
        },
        body: JSON.stringify({ points }),
      })

      if (!res.ok) {
        console.error('Failed to generate QR code')
        return
      }

      const data = await res.json()
      setQrData({
        token: data.token,
        qrUrl: data.qrUrl,
        expiresAt: data.expiresAt,
        points: points
      })
    } catch (e) {
      console.error('QR generation error:', e)
    } finally {
      setGeneratingQR(false)
    }
  }

  return (
    <div>
      {/* карта за камерата */}
      <div
        onClick={() => setOpen(true)}
        className="
          group relative overflow-hidden rounded-xl border cursor-pointer
          bg-card border-border hover:border-green-400 hover:shadow-lg hover:shadow-green-200/50
          dark:hover:shadow-green-500/20 transition-all duration-300
        "
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-400" />
        <div className="p-5">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex-shrink-0">
              <Camera className="h-6 w-6 text-green-500 group-hover:text-green-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold">Свободно сканиране</h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Сканирайте рециклируеми артикули по всяко време без конкретна задача
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
              <Leaf className="h-3 w-3" />
              Свободно сканиране
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              className="
                group/btn relative w-full px-4 py-2.5 
                bg-green-500 hover:bg-green-600 
                dark:bg-green-600 dark:hover:bg-green-500
                text-white text-sm font-medium rounded-lg 
                transition-all duration-200 shadow-md hover:shadow-lg 
                hover:scale-[1.02] active:scale-[0.98]
              "
            >
              Отвори камера
            </button>
          </div>
        </div>
      </div>

      {/* камера модал с тъмен слой и центриране */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Тъмен слой (overlay) */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setOpen(false)} 
          />
          
          {/* Модален прозорец в абсолютния център */}
          <div className="
            relative bg-background overflow-hidden w-full h-full flex flex-col 
            /* Десктоп размери и центриране */
            md:max-w-5xl md:h-[85vh] md:rounded-3xl
            shadow-2xl border-0 md:border md:border-border/50
            z-50
          ">
            
            {/* заглавна част */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Свободно сканиране
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setOpen(false)
                    setError(null)
                    setResult(null)
                  }}
                  className="
                    p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white 
                    transition-colors md:p-2.5
                  "
                  aria-label="Затвори"
                >
                  <X className="h-5 w-5 md:h-6 md:w-6" />
                </button>
              </div>
            </div>

            {/* видео изход */}
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* контроли */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6 lg:p-8">
              <div className="flex items-center justify-center">
                <button
                  onClick={capture}
                  disabled={loading}
                  className="
                    px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-4
                    bg-green-500 hover:bg-green-600 
                    dark:bg-green-600 dark:hover:bg-green-500
                    text-white font-semibold rounded-lg md:rounded-xl
                    transition-all duration-200 
                    shadow-lg hover:shadow-xl hover:scale-105 
                    active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    flex items-center gap-2 md:gap-3
                    text-base md:text-lg
                  "
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                      Сканиране...
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 md:h-6 md:w-6" />
                      Сканирай сега
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* резултат */}
            {result && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-20">
                <div className="
                  relative bg-card rounded-xl md:rounded-2xl p-6 md:p-8 lg:p-10 
                  w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl
                  border shadow-xl
                ">
                  <button
                    onClick={() => {
                      setResult(null)
                      setQrData(null)
                      setOpen(false)
                    }}
                    className="
                      absolute top-3 right-3 md:top-4 md:right-4 lg:top-5 lg:right-5
                      text-foreground/70 hover:text-foreground transition-colors
                    "
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 dark:text-neutral-600" />
                  </button>

                  <div className="flex flex-col items-center text-center gap-4 md:gap-6 lg:gap-8">
                    <div className="flex flex-col items-center gap-2 md:gap-3">
                      <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-green-500" />
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold">
                        {result.material || 'Успешно сканиране'}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3 w-full justify-center">
                      <div className="bg-primary/10 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-1.5 md:gap-2 border border-primary/20">
                        <Hash className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                        <span className="text-sm md:text-base font-bold text-primary">
                          {result.count} бр.
                        </span>
                      </div>
                      <div className="bg-amber-500/10 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-1.5 md:gap-2 border border-amber-500/20">
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                        <span className="text-sm md:text-base font-bold text-amber-600">
                          +{result.points} т.
                        </span>
                      </div>
                      {result.co2 && (
                        <div className="bg-emerald-500/10 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-1.5 md:gap-2 border border-emerald-500/20">
                          <Leaf className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                          <span className="text-sm md:text-base font-bold text-emerald-600">
                            {result.co2}г CO₂
                          </span>
                        </div>
                      )}
                    </div>

                    {qrData ? (
                      <div className="flex flex-col items-center gap-3 md:gap-4">
                        <div className="p-4 md:p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg">
                          <QRCodeSVG
                            value={qrData.qrUrl}
                            size={160}
                            className="md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px]"
                            fgColor="#00CD56"
                            bgColor="transparent"
                          />
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground dark:text-neutral-400">
                          Сканирай за точки
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground/60">
                          Валиден до: {new Date(qrData.expiresAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 md:gap-4">
                        <div className="p-4 md:p-5 bg-background/50 dark:bg-[#1D1D1D] rounded-lg flex items-center justify-center w-[160px] h-[160px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px]">
                          <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-green-500" />
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground">
                          Генериране на награда...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* При грешки */}
            {error && (
              <div className="absolute inset-0 bg-black/80 dark:bg-black/90 flex items-center justify-center p-4 md:p-6 backdrop-blur-sm z-20">
                <div className="
                  bg-background rounded-xl md:rounded-2xl p-5 md:p-6 lg:p-8 
                  max-w-sm sm:max-w-md md:max-w-lg w-full 
                  border border-red-500/30 shadow-2xl
                ">
                  <div className="flex items-center justify-center mb-3 md:mb-4 lg:mb-5">
                    <div className="p-2.5 md:p-3 rounded-full bg-red-500/10">
                      <AlertCircle className="h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 text-red-500" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-center mb-2 md:mb-3">
                    Неуспешно сканиране
                  </h3>
                  <p className="text-muted-foreground text-center mb-4 md:mb-6 text-sm md:text-base">
                    {error}
                  </p>

                  <button
                    onClick={() => setError(null)}
                    className="
                      w-full px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3.5
                      bg-red-500 hover:bg-red-600 
                      text-white font-semibold rounded-lg md:rounded-xl
                      transition-all duration-200 text-sm md:text-base
                    "
                  >
                    Опитай отново
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}