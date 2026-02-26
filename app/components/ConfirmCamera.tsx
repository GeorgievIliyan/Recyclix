"use client";

import { Camera, CheckCircle2, OctagonAlert, X, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmCameraProps {
  userDailyTaskId: string;
  onConfirm: (success: boolean) => void;
  inlineMode?: boolean;
}

export default function ConfirmCamera({
  userDailyTaskId,
  onConfirm,
  inlineMode = false,
}: ConfirmCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [apiResult, setApiResult] = useState<{
    success: boolean;
    result: string;
    taskTitle?: string;
    taskDescription?: string;
    error?: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (inlineMode) {
      setOpen(true);
    }
  }, [inlineMode]);

  useEffect(() => {
    if (!open || image) return;

    const startCamera = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch((err) => {
            console.error("Error playing video:", err);
          });
        }

        setError(null);
        setIsCameraActive(true);
      } catch (err: any) {
        setError("Грешка с камерата: " + err.message);
        setIsCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [open, image]);

  const takePhoto = () => {
    if (!videoRef.current || !isCameraActive) return;

    try {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Грешка при създаване на контекст");
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.85);
      setImage(base64Image);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      setIsCameraActive(false);
      setApiResult(null);
    } catch (err: any) {
      setError("Грешка при заснемане: " + err.message);
    }
  };

  const confirmTask = async () => {
    if (!image) {
      setError("Моля, направете снимка първо");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/confirm-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_SECURE_API_KEY!,
        },
        body: JSON.stringify({
          userDailyTaskId,
          image,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Грешка при верификация");
      }

      setApiResult({
        success: data.result === "YES",
        result: data.result,
        error:
          data.result === "NO" ? "Предметът не беше разпознат." : undefined,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    // Очисть всички състояния
    setImage(null);
    setError(null);
    setApiResult(null);
    setIsCameraActive(false);

    // Останови лични токове
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    // Малко эвчане, за да подготовим приди да воторим
    setTimeout(() => {
      setOpen(true);
    }, 100);
  };

  const closeModal = () => {
    setOpen(false);
    setImage(null);
    setError(null);
    setApiResult(null);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);

    if (!apiResult?.success) {
      onConfirm(false);
    }
  };

  const handleConfirm = () => {
    if (apiResult?.success) {
      onConfirm(true);
    } else {
      onConfirm(false);
    }
    closeModal();
  };

  if (inlineMode) {
    return (
      <>
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
                        Потвърди задача
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

                {!image ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />

                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6 lg:p-8">
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">
                    {error && !apiResult && (
                      <div className="w-full p-3 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg">
                        <p className="text-xs text-white text-center">
                          {error}
                        </p>
                      </div>
                    )}

                    {apiResult?.success && (
                      <div className="w-full p-6 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                          <h4 className="text-lg font-semibold text-white">
                            Успешна верификация!
                          </h4>
                          <p className="text-sm text-white/80 text-center">
                            Снимката съответства на задачата.
                          </p>
                          <button
                            onClick={handleConfirm}
                            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all duration-200"
                          >
                            Затвори
                          </button>
                        </div>
                      </div>
                    )}

                    {apiResult && !apiResult.success && (
                      <div className="w-full p-6 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <OctagonAlert className="w-12 h-12 text-red-500" />
                          <h4 className="text-lg font-semibold text-white">
                            Верификация неуспешна
                          </h4>
                          <p className="text-sm text-white/80 text-center">
                            {apiResult.error ||
                              "Снимката не съответства на задачата."}
                          </p>
                          <div className="flex gap-3 w-full">
                            <button
                              onClick={retakePhoto}
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

                    {!apiResult && (
                      <>
                        {!image ? (
                          <button
                            onClick={takePhoto}
                            disabled={!isCameraActive}
                            className="w-full px-6 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-lg md:rounded-xl transition-all duration-200 shadow-lg shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-base md:text-lg overflow-hidden group/btn relative"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <Camera className="h-5 w-5 md:h-6 md:w-6" />
                              Заснеми
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                          </button>
                        ) : (
                          <div className="w-full flex gap-3">
                            <button
                              onClick={retakePhoto}
                              disabled={loading}
                              className="flex-1 px-6 py-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 group/btn relative overflow-hidden"
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                Отново
                              </span>
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                            </button>
                            <button
                              onClick={confirmTask}
                              disabled={loading}
                              className="flex-1 px-6 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/30 group/btn relative overflow-hidden"
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                {loading ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Обработка...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Потвърди
                                  </>
                                )}
                              </span>
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                            </button>
                          </div>
                        )}
                      </>
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

  return (
    <>
      <div className="w-full">
        <button
          onClick={() => setOpen(true)}
          className="group relative w-full px-4 py-2.5 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md shadow-[#00CD56]/20 hover:shadow-lg hover:shadow-[#00CD56]/30 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />
            Отвори камера
          </span>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
        </button>
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
                      Потвърди задача
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

              {!image ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6 lg:p-8">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto w-full">
                  {error && !apiResult && (
                    <div className="w-full p-3 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg">
                      <p className="text-xs text-white text-center">{error}</p>
                    </div>
                  )}

                  {apiResult?.success && (
                    <div className="w-full p-6 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                        <h4 className="text-lg font-semibold text-white">
                          Успешна верификация!
                        </h4>
                        <p className="text-sm text-white/80 text-center">
                          Снимката съответства на задачата.
                        </p>
                        <button
                          onClick={handleConfirm}
                          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all duration-200"
                        >
                          Затвори
                        </button>
                      </div>
                    </div>
                  )}

                  {apiResult && !apiResult.success && (
                    <div className="w-full p-6 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg">
                      <div className="flex flex-col items-center gap-3">
                        <OctagonAlert className="w-12 h-12 text-red-500" />
                        <h4 className="text-lg font-semibold text-white">
                          Верификация неуспешна
                        </h4>
                        <p className="text-sm text-white/80 text-center">
                          {apiResult.error ||
                            "Снимката не съответства на задачата."}
                        </p>
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={retakePhoto}
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

                  {!apiResult && (
                    <>
                      {!image ? (
                        <button
                          onClick={takePhoto}
                          disabled={!isCameraActive}
                          className="w-full px-6 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-lg md:rounded-xl transition-all duration-200 shadow-lg shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-base md:text-lg overflow-hidden group/btn relative"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <Camera className="h-5 w-5 md:h-6 md:w-6" />
                            Заснеми
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        </button>
                      ) : (
                        <div className="w-full flex gap-3">
                          <button
                            onClick={retakePhoto}
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 group/btn relative overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Отново
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                          </button>
                          <button
                            onClick={confirmTask}
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-gradient-to-br from-[#00CD56] via-emerald-500 to-[#00b849] hover:from-[#00b849] hover:via-[#00a341] hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/30 group/btn relative overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {loading ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Обработка...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-5 h-5" />
                                  Потвърди
                                </>
                              )}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                          </button>
                        </div>
                      )}
                    </>
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
