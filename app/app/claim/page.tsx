"use client";

import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

type ClaimStatus = "loading" | "valid" | "invalid" | "expired" | "claimed";

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ClaimStatus>("loading");
  const [points, setPoints] = useState(0);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/bin/scan");
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/claim-points/check?token=${token}`);
        const data = await res.json();

        if (!res.ok && res.status !== 409) {
          setStatus("invalid");
          return;
        }
        setStatus(data.status);

        if (data.status === "valid") {
          setPoints(data.points);
        }
      } catch {
        setStatus("invalid");
      }
    }

    checkToken();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Проверка на кода...</h1>
        </div>
      </div>
    );
  }

  if (status === "claimed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Използван...</h1>
          <p className="text-muted-foreground mb-6">
            Този QR код вече е бил сканиран
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/app/dashboard")}
              className="bg-primary text-primary-foreground px-6 py-3 hover:bg-neutral-400 transition duration-250 rounded-lg font-medium w-full"
            >
              Начално табло
            </button>
            <button
              onClick={() => router.back()}
              className="bg-primary text-primary-foreground hover:text-white hover:bg-red-500 transition duration-250 px-6 py-3 rounded-lg font-medium w-full"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Изтекъл код</h1>
          <p className="text-muted-foreground mb-6">
            QR кодът е изтекъл и вече не е валиден.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/app/dashboard")}
              className="bg-primary text-primary-foreground px-6 py-3 hover:bg-neutral-400 transition duration-250 rounded-lg font-medium w-full"
            >
              Начално табло
            </button>
            <button
              onClick={() => router.back()}
              className="bg-primary text-primary-foreground hover:text-white hover:bg-red-500 transition duration-250 px-6 py-3 rounded-lg font-medium w-full"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Невалиден код....</h1>
          <p className="text-muted-foreground mb-6">
            QR кодът не съществува или е грешен
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/app/dashboard")}
              className="bg-primary text-primary-foreground px-6 py-3 hover:bg-neutral-400 transition duration-250 rounded-lg font-medium w-full"
            >
              Начално табло
            </button>
            <button
              onClick={() => router.back()}
              className="bg-primary text-primary-foreground hover:text-white hover:bg-red-500 transition duration-250 px-6 py-3 rounded-lg font-medium w-full"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-semibold mb-4">Успешно сканиран код!</h1>

        <div className="text-4xl font-bold text-green-500 mb-2">{points}</div>
        <p className="text-muted-foreground mb-6">точки получени</p>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/app/dashboard")}
            className="bg-primary text-primary-foreground px-6 py-3 hover:bg-neutral-400 transition duration-250 rounded-lg font-medium w-full"
          >
            Начално табло
          </button>
          <button
            onClick={() => router.back()}
            className="bg-primary text-primary-foreground hover:text-white hover:bg-red-500 transition duration-250 px-6 py-3 rounded-lg font-medium w-full"
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Зареждане...</h1>
          </div>
        </div>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
