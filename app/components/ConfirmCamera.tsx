"use client";

import { useRef, useState, useEffect } from "react";

interface ConfirmCameraProps {
  userDailyTaskId: string; // must be primary key from user_daily_tasks
  onConfirm: (success: boolean) => void;
}

export default function ConfirmCamera({ userDailyTaskId, onConfirm }: ConfirmCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const startCamera = async () => {
    try {
      stream?.getTracks().forEach((t) => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(newStream);
      if (videoRef.current) videoRef.current.srcObject = newStream;
      setError(null);
    } catch (err: any) {
      setError("Camera error: " + err.message);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    let width = videoRef.current.videoWidth;
    let height = videoRef.current.videoHeight;
    const maxW = 1920, maxH = 1080;
    if (width > maxW) { height = (height * maxW) / width; width = maxW; }
    if (height > maxH) { width = (width * maxH) / height; height = maxH; }
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(width, 0); ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, width, height);
    setImage(canvas.toDataURL("image/jpeg", 0.85));
    stream?.getTracks().forEach((t) => t.stop()); setStream(null);
  };

  const confirmTask = async () => {
    if (!image) { setError("Take a photo first"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/gemini-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userDailyTaskId, image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirmation failed");
      data.result === "YES" ? onConfirm(true) : (setError("Verification failed"), onConfirm(false));
    } catch (err: any) { setError(err.message || "Unexpected error"); onConfirm(false); }
    finally { setLoading(false); }
  };

  const retakePhoto = () => { setImage(null); startCamera(); };

  return (
    <div className="p-4 border rounded-lg max-w-lg mx-auto space-y-4">
      {!image ? (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-lg bg-gray-900" />
          <div className="flex gap-2">
            <button onClick={startCamera} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">Start Camera</button>
            <button onClick={takePhoto} disabled={!stream} className="flex-1 px-4 py-2 bg-green-600 text-white rounded">Take Photo</button>
          </div>
        </>
      ) : (
        <>
          <img src={image} className="w-full h-64 object-cover rounded-lg" />
          <div className="flex gap-2">
            <button onClick={retakePhoto} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded">Retake</button>
            <button onClick={confirmTask} disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded">{loading ? "Processing..." : "Confirm Task"}</button>
          </div>
        </>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
