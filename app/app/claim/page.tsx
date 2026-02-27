"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
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

const createBrowserClient = (): SupabaseClient => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
};

// Споделени примитиви

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-background">
    <div className="max-w-md w-full text-center bg-card border rounded-2xl shadow-xl p-10 flex flex-col items-center">
      {children}
    </div>
  </div>
);

const IconCircle = ({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) => (
  <div
    className={`w-20 h-20 rounded-full ${bg} flex items-center justify-center mb-6`}
  >
    {children}
  </div>
);

const Title = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-2xl font-bold mb-2 text-foreground">{children}</h1>
);

const Subtitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{children}</p>
);

const Btn = ({
  onClick,
  variant = "outline",
  children,
}: {
  onClick: () => void;
  variant?: "primary" | "outline";
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
      variant === "primary"
        ? "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20"
        : "bg-card border border-border hover:bg-muted text-foreground"
    }`}
  >
    {children}
  </button>
);

const BtnRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3 w-full">{children}</div>
);

// Екрани

const Loading = () => (
  <Card>
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
    <Title>Проверка на кода...</Title>
  </Card>
);

const Unauthenticated = ({ handleLogin, router }: any) => (
  <Card>
    <IconCircle bg="bg-amber-500/10">
      <AlertCircle className="w-10 h-10 text-amber-500" />
    </IconCircle>
    <Title>Влезте в профила си</Title>
    <Subtitle>За да вземете точките, трябва да сте влезли в своя профил.</Subtitle>
    <BtnRow>
      <Btn variant="primary" onClick={handleLogin}>Вход в профил</Btn>
      <Btn onClick={() => router.back()}>Назад</Btn>
    </BtnRow>
  </Card>
);

const Claimed = ({ handleDashboard, router }: any) => (
  <Card>
    <IconCircle bg="bg-orange-500/10">
      <AlertCircle className="w-10 h-10 text-orange-500" />
    </IconCircle>
    <Title>Вече използван</Title>
    <Subtitle>Този QR код вече е бил сканиран и не може да се използва повторно.</Subtitle>
    <BtnRow>
      <Btn onClick={handleDashboard}>Начало</Btn>
      <Btn onClick={() => router.back()}>Назад</Btn>
    </BtnRow>
  </Card>
);

const Expired = ({ handleDashboard, router }: any) => (
  <Card>
    <IconCircle bg="bg-amber-500/10">
      <Clock className="w-10 h-10 text-amber-500" />
    </IconCircle>
    <Title>Изтекъл код</Title>
    <Subtitle>QR кодът е изтекъл и вече не е валиден.</Subtitle>
    <BtnRow>
      <Btn onClick={handleDashboard}>Начало</Btn>
      <Btn onClick={() => router.back()}>Назад</Btn>
    </BtnRow>
  </Card>
);

const Invalid = ({ handleDashboard, router }: any) => (
  <Card>
    <IconCircle bg="bg-red-500/10">
      <XCircle className="w-10 h-10 text-red-500" />
    </IconCircle>
    <Title>Невалиден код</Title>
    <Subtitle>QR кодът не съществува или е грешен.</Subtitle>
    <BtnRow>
      <Btn onClick={handleDashboard}>Начало</Btn>
      <Btn onClick={() => router.back()}>Назад</Btn>
    </BtnRow>
  </Card>
);

const Success = ({
  points,
  newTotal,
  handleDashboard,
  router,
}: {
  points: number;
  newTotal: number;
  handleDashboard: () => void;
  router: any;
}) => (
  <Card>
    <IconCircle bg="bg-green-500/10">
      <CheckCircle2 className="w-10 h-10 text-green-500 mb-0" />
    </IconCircle>
    <Title>Успешно сканиран код!</Title>

    {/* Спечелени точки */}
    <div className="w-full rounded-xl bg-green-500/10 border border-green-500/20 px-6 py-4 mb-3 mt-3">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Спечелени точки</p>
      <div className="text-4xl font-bold text-green-500">+{points}</div>
    </div>

    {/* Нов общ брой */}
    <div className="w-full rounded-xl bg-muted/50 border border-border px-6 py-4 mb-6">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
        <Sparkles className="h-3 w-3 text-green-400" />
        Общо XP
      </p>
      <div className="text-4xl font-semibold text-foreground">{newTotal.toLocaleString("bg-BG")}</div>
    </div>

    <BtnRow>
      <Btn variant="primary" onClick={handleDashboard}>Начало</Btn>
      <Btn onClick={() => router.back()}>Назад</Btn>
    </BtnRow>
  </Card>
);

// Основна логика

function ClaimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ClaimStatus>("loading");
  const [points, setPoints] = useState(0);
  const [newTotal, setNewTotal] = useState(0);

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
    if (!token) { setStatus("invalid"); return; }
    if (hasClaimed.current) return;
    hasClaimed.current = true;

    const checkAndClaim = async () => {
      try {
        // Стъпка 1: сесия
        const { data: { session }, error: sessionError } =
          await supabaseClient.current.auth.getSession();

        if (sessionError || !session) {
          if (isDev) console.warn("[ClaimPage] No session:", sessionError);
          setStatus("unauthenticated");
          return;
        }

        const currentUserId = session.user.id;

        // Стъпка 2: провери токен
        const res = await fetch(`/api/claim-points/check?token=${token}`);
        const data = await res.json();

        if (!res.ok && res.status !== 409) return setStatus("invalid");
        if (data.status === "expired") return setStatus("expired");
        if (data.status === "claimed") return setStatus("claimed");
        if (data.status !== "valid") return setStatus("invalid");

        // Стъпка 3: заяви награди
        const claimRes = await fetch("/api/claim-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: token, userId: currentUserId }),
        });

        const claimData = await claimRes.json();

        if (!claimRes.ok) {
          setStatus(claimData.error === "user_not_found" ? "unauthenticated" : "invalid");
          return;
        }

        setPoints(claimData.pointsAwarded);
        setNewTotal(claimData.newTotal);
        setStatus("valid");
      } catch (err) {
        if (isDev) console.error("[ClaimPage] unexpected error:", err);
        setStatus("invalid");
      }
    };

    checkAndClaim();
  }, [token]);

  if (status === "loading") return <Loading />;
  if (status === "unauthenticated") return <Unauthenticated handleLogin={handleLogin} router={router} />;
  if (status === "claimed") return <Claimed handleDashboard={handleDashboard} router={router} />;
  if (status === "expired") return <Expired handleDashboard={handleDashboard} router={router} />;
  if (!token || status === "invalid") return <Invalid handleDashboard={handleDashboard} router={router} />;

  return <Success points={points} newTotal={newTotal} handleDashboard={handleDashboard} router={router} />;
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClaimContent />
    </Suspense>
  );
}