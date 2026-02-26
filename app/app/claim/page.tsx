"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isDev } from "@/lib/isDev";

type ClaimStatus =
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "claimed"
  | "unauthenticated";

// Създаваме нов Supabase браузърен клиент вътре в страницата
const createBrowserClient = (): SupabaseClient => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,    // задръж това
        autoRefreshToken: true,  // задръж това
        // storage: localStorage <-- REMOVE THIS
      },
    }
  );
};

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ClaimStatus>("loading");
  const [points, setPoints] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const hasClaimed = useRef(false);
  const supabaseClient = useRef<SupabaseClient>(createBrowserClient());

  const handleDashboard = async () => {
    await supabaseClient.current.auth.signOut();
    router.push("/app/dashboard");
  };

  const handleLogin = () => {
    router.push("/login?redirect=" + encodeURIComponent(`/claim?token=${token}`));
  };

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    if (hasClaimed.current) return;
    hasClaimed.current = true;

    const checkAndClaim = async () => {
      try {
        // Стъпка 1: Вземи сесия
        const { data: { session }, error: sessionError } = await supabaseClient.current.auth.getSession();
        if (sessionError) {
          if (isDev) console.error("[ClaimPage] session error:", sessionError);
          setStatus("unauthenticated");
          return;
        }

        if (!session) {
          if (isDev) console.warn("[ClaimPage] No session found");
          setStatus("unauthenticated");
          return;
        }

        const currentUserId = session.user.id;
        setUserId(currentUserId);

        // Стъпка 2: Провери токена
        const res = await fetch(`/api/claim-points/check?token=${token}`);
        const data = await res.json();

        if (!res.ok && res.status !== 409) return setStatus("invalid");
        if (data.status === "expired") return setStatus("expired");
        if (data.status === "claimed") return setStatus("claimed");
        if (data.status !== "valid") return setStatus("invalid");

        // Стъпка 3: Искане на точки
        const claimRes = await fetch("/api/claim-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: token, userId: currentUserId }),
        });

        const claimData = await claimRes.json();
        if (!claimRes.ok) {
          if (claimData.error === "user_not_found") setStatus("unauthenticated");
          else setStatus("invalid");
          return;
        }

        setPoints(claimData.pointsAwarded);
        setStatus("valid");
      } catch (err) {
        if (isDev) console.error("[ClaimPage] unexpected error:", err);
        setStatus("invalid");
      }
    };

    checkAndClaim();
  }, [token]);

  // --- Рендиране на интерфейса (същото като преди) ---
  if (status === "loading") return <Loading />;
  if (status === "unauthenticated") return <Unauthenticated handleLogin={handleLogin} router={router} />;
  if (status === "claimed") return <Claimed handleDashboard={handleDashboard} router={router} />;
  if (status === "expired") return <Expired handleDashboard={handleDashboard} router={router} />;
  if (!token || status === "invalid") return <Invalid handleDashboard={handleDashboard} router={router} />;

  return <Success points={points} handleDashboard={handleDashboard} router={router} />;
}

// ------------------ UI Components ------------------
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Проверка на кода...</h1>
    </div>
  </div>
);

const Unauthenticated = ({ handleLogin, router }: any) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-12 h-12 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Влезте в профила си</h1>
      <p className="text-muted-foreground mb-6">
        За да вземете точките, трябва да сте влезли в своя профил.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleLogin}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium w-full"
        >
          Вход в профил
        </button>
        <button
          onClick={() => router.back()}
          className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-lg font-medium w-full"
        >
          Назад
        </button>
      </div>
    </div>
  </div>
);

const Claimed = ({ handleDashboard, router }: any) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
      <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-12 h-12 text-orange-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Използван...</h1>
      <p className="text-muted-foreground mb-6">Този QR код вече е бил сканиран</p>
      <div className="flex gap-2">
        <button onClick={handleDashboard} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Начално табло</button>
        <button onClick={() => router.back()} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Назад</button>
      </div>
    </div>
  </div>
);

const Expired = ({ handleDashboard, router }: any) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-12 h-12 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Изтекъл код</h1>
      <p className="text-muted-foreground mb-6">QR кодът е изтекъл и вече не е валиден.</p>
      <div className="flex gap-2">
        <button onClick={handleDashboard} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Начално табло</button>
        <button onClick={() => router.back()} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Назад</button>
      </div>
    </div>
  </div>
);

const Invalid = ({ handleDashboard, router }: any) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-12 h-12 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Невалиден код....</h1>
      <p className="text-muted-foreground mb-6">QR кодът не съществува или е грешен</p>
      <div className="flex gap-2">
        <button onClick={handleDashboard} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Начално табло</button>
        <button onClick={() => router.back()} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Назад</button>
      </div>
    </div>
  </div>
);

const Success = ({ points, handleDashboard, router }: any) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-xl shadow-lg p-8">
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>
      <h1 className="text-2xl font-semibold mb-4">Успешно сканиран код!</h1>
      <div className="text-4xl font-bold text-green-500 mb-2">{points}</div>
      <p className="text-muted-foreground mb-6">точки получени</p>
      <div className="flex gap-2">
        <button onClick={handleDashboard} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Начално табло</button>
        <button onClick={() => router.back()} className="bg-white text-gray-900 border px-6 py-3 rounded-lg w-full">Назад</button>
      </div>
    </div>
  </div>
);

export default function ClaimPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClaimContent />
    </Suspense>
  );
}