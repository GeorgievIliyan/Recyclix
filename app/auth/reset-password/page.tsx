"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck, Eye, EyeOff, CircleCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { RecyclingLoader } from "@/app/components/ui/RecyclingLoader";
import { Navigation } from "@/app/components/ui/Navigation";

type Status = "idle" | "loading" | "success" | "error";

interface PasswordStrength {
  score: number; // 0–4
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: "Много слаба", color: "bg-red-500" },
    { score: 1, label: "Слаба", color: "bg-orange-500" },
    { score: 2, label: "Средна", color: "bg-yellow-500" },
    { score: 3, label: "Добра", color: "bg-green-400" },
    { score: 4, label: "Силна", color: "bg-emerald-500" },
  ];

  return levels[score];
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const strength = newPassword ? getPasswordStrength(newPassword) : null;
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit() {
    setErrorMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg("Моля, попълнете всички полета.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Новите пароли не съвпадат.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("Новата парола трябва да е поне 8 символа.");
      return;
    }

    setStatus("idle");
    setIsLoading(true);

    // Взимаме текущия потребител
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.email) {
      setErrorMsg("Не може да се намери потребителят.");
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Проверяваме текущата парола чрез повторно влизане
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });

    if (signInError) {
      setErrorMsg("Текущата парола е грешна.");
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Обновяваме паролата в Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setErrorMsg(updateError.message);
      setStatus("error");
      setIsLoading(false);
      return;
    }

    // Записваме датата на промяната в потребителския профил
    await supabase
      .from("user_profiles")
      .update({ password_changed_at: new Date().toISOString() })
      .eq("id", userData.user.id);

    setStatus("success");
    setIsLoading(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  // Показваме зареждащ екран докато се обработва заявката
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <RecyclingLoader />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-zinc-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-zinc-900 overflow-hidden">

      {/* Фонов блясък — горе вляво */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-green-500/10 blur-[100px]" />

      {/* Фонов блясък — долу вдясно */}
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />

      <Navigation />

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 md:pt-16 lg:pt-22">

        {/* Хедър картичка с блясък около иконата */}
        <Card className="mb-6 border-neutral-200/50 dark:border-neutral-800/50 hover:border-green-500/30 transition-colors duration-300 overflow-hidden">
          <CardContent className="items-center">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">

              {/* Икона с ореол */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl scale-125" />
                <div className="relative size-20 sm:size-24 rounded-full ring-2 ring-green-500/30 ring-offset-2 ring-offset-background flex items-center justify-center bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
                  <Lock className="w-9 h-9 text-white drop-shadow-sm" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Промяна на парола
                </h1>
                <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
                  {/* Пулсиращ индикатор за активен акаунт */}
                  <span className="relative inline-flex size-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                  </span>
                  Актуализирайте паролата си за по-добра сигурност
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Банер за успех */}
        {status === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-600 dark:text-green-400 shadow-sm shadow-green-500/10">
            <CircleCheck className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Паролата беше успешно променена.</p>
          </div>
        )}

        {/* Банер за грешка */}
        {(status === "error" || errorMsg) && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
            <Lock className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMsg ?? "Възникна грешка."}</p>
          </div>
        )}

        {/* Формуляр за нова парола */}
        <Card className="mb-6 gap-2 border-neutral-200/50 dark:border-neutral-800/50 hover:border-green-500/30 transition-all duration-300 overflow-hidden hover:shadow-md hover:shadow-green-500/5">
          <CardHeader>
            <CardTitle className="text-xl flex flex-row gap-2 items-center">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400/10 to-green-500/10 shadow-sm shadow-green-500/10">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <p>Нова парола</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Текуща парола */}
            <div className="space-y-2 p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200">
              <Label htmlFor="current" className="text-sm font-medium text-muted-foreground">
                Текуща парола
              </Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrorMsg(null);
                    setStatus("idle");
                  }}
                  placeholder="Въведете текущата си парола"
                  className="pr-10 border-neutral-200/50 dark:border-neutral-700/50 focus-visible:ring-green-500/50 focus-visible:border-green-500/50 transition-colors"
                />
                {/* Бутон за показване/скриване */}
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-green-500 transition-colors duration-200"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Нова парола */}
            <div className="space-y-2 p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200">
              <Label htmlFor="new" className="text-sm font-medium text-muted-foreground">
                Нова парола
              </Label>
              <div className="relative">
                <Input
                  id="new"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMsg(null);
                    setStatus("idle");
                  }}
                  placeholder="Въведете нова парола"
                  className="pr-10 border-neutral-200/50 dark:border-neutral-700/50 focus-visible:ring-green-500/50 focus-visible:border-green-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-green-500 transition-colors duration-200"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Индикатор за сила на паролата */}
              {newPassword.length > 0 && strength && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i < strength.score
                            ? `${strength.color} shadow-sm shadow-green-500/30`
                            : "bg-neutral-200 dark:bg-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Сила на паролата:{" "}
                    <span className="font-medium text-foreground">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Потвърждение на новата парола */}
            <div className="space-y-2 p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200">
              <Label htmlFor="confirm" className="text-sm font-medium text-muted-foreground">
                Потвърди нова парола
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg(null);
                    setStatus("idle");
                  }}
                  placeholder="Повторете новата парола"
                  className={`pr-10 border-neutral-200/50 dark:border-neutral-700/50 focus-visible:ring-green-500/50 transition-colors ${
                    passwordsMismatch ? "border-red-400/60 focus-visible:ring-red-400/50" : ""
                  } ${
                    // Зелена рамка при съвпадащи пароли
                    passwordsMatch ? "border-green-400/60 focus-visible:ring-green-400/50 shadow-sm shadow-green-500/10" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-green-500 transition-colors duration-200"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Съобщения за съвпадение */}
              {passwordsMismatch && (
                <p className="text-xs text-red-500">Паролите не съвпадат.</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CircleCheck className="w-3 h-3" /> Паролите съвпадат.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Картичка с изисквания за паролата */}
        <Card className="mb-6 gap-2 border-neutral-200/50 dark:border-neutral-800/50 hover:border-green-500/30 transition-all duration-300 overflow-hidden hover:shadow-md hover:shadow-green-500/5">
          <CardHeader>
            <CardTitle className="text-xl flex flex-row gap-2 items-center">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400/10 to-green-500/10 shadow-sm shadow-green-500/10">
                <Lock className="w-5 h-5 text-green-500" />
              </div>
              <p>Изисквания за парола</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Поне 8 символа", met: newPassword.length >= 8 },
              { label: "Поне една главна буква (A–Z)", met: /[A-Z]/.test(newPassword) },
              { label: "Поне една цифра (0–9)", met: /[0-9]/.test(newPassword) },
              { label: "Поне един специален символ (!@#…)", met: /[^A-Za-z0-9]/.test(newPassword) },
            ].map(({ label, met }) => (
              <div
                key={label}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200"
              >
                {/* Точка — светва в зелено когато изискването е изпълнено */}
                <span
                  className={`inline-block size-2 rounded-full transition-all duration-300 ${
                    met
                      ? "bg-gradient-to-r from-green-400 to-green-500 shadow-sm shadow-green-500/60"
                      : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                />
                <p className={`text-sm transition-colors duration-200 ${met ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Бутони за действие */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto bg-transparent hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent hover:border-green-500/40 transition-all duration-200"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Назад
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="group w-full text-white dark:text-white sm:flex-1 bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 hover:from-green-500 hover:via-green-600 hover:to-emerald-700 transition-all duration-200 items-center shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/30"
          >
            <Lock className="mr-1 h-4 w-4" />
            Запази новата парола
          </Button>
          {/* Бутон за изчистване на формуляра */}
          <Button
            variant="outline"
            onClick={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setErrorMsg(null);
              setStatus("idle");
            }}
            className="w-full sm:w-auto bg-transparent hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent hover:border-green-500/40 transition-all duration-200"
          >
            Изчисти
          </Button>
        </div>
      </div>
    </div>
  );
}