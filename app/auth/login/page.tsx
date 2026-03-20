"use client";

import { supabase } from "@/lib/supabase-browser";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CircleCheck, OctagonAlert, X, LogIn } from "lucide-react";

const translateMessage = (message: string) => {
  if (message.toLowerCase() == "invalid login credentials") {
    return "Грешна парола или имейл";
  }
  if (message.toLowerCase() == "invalid input") {
    return "Грешни данни или потребителят несъществува";
  }
};

export default function LoginPage() {
  const router = useRouter();

  // Състояния за имейл, парола, съобщения и зареждане
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordShown, setPasswordShown] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    router.replace("/app/dashboard");
  }, [router]);

  // Проверка за съобщение след регистрация
  useEffect(() => {
    const msg = sessionStorage.getItem("registrationMessage");
    if (msg) {
      setMessage(msg);
      sessionStorage.removeItem("registrationMessage");
    }
  }, []);

  const handleTogglePassword = () => {
    setPasswordShown(!passwordShown);
  };

  const handleCloseMessage = () => {
    setMessage(null);
  };

  const handleEmailLogin = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Проста валидация
    if (!cleanEmail || !cleanPassword) {
      setMessage("Имейл и парола са задължителни.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setMessage("Невалиден имейл адрес.");
      return;
    }

    setPasswordShown(false);
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) setMessage(error.message);
      else {
        router.push("/app/dashboard");
        router.refresh();
      }
    } catch {
      setMessage("Възникна неочаквана грешка.");
    } finally {
      setLoading(false);
    }
  };

  // Вход чрез Google OAuth
  const handleGoogleLogin = async () => {
    try {
      setPasswordShown(false);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app/dashboard` },
      });

      if (error) setMessage(error.message);
    } catch (err: any) {
      setMessage("Неуспешен Google вход.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-black p-4">
      <div className="w-full max-w-md">
        <div className="relative backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 p-8 md:p-10 overflow-hidden">
          {/* Декоративни кръгове */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00CD56]/20 dark:bg-[#00CD56]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#00CD56]/10 dark:bg-[#00CD56]/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Заглавие и подзаглавие */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 dark:from-white dark:via-neutral-100 dark:to-white bg-clip-text text-transparent mb-2">
                Влезте в своя профил
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Добре дошли обратно! Моля, въведете вашите данни
              </p>
            </div>

            {/* Съобщение за грешка или информация */}
            {message &&
              (() => {
                const isSuccess =
                  message.includes("успеш") || message.includes("Пренасочване");

                return (
                  <div
                    className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${isSuccess
                      ? "bg-[#00CD56]/10 border-[#00CD56]/30 dark:bg-[#00CD56]/20 dark:border-[#00CD56]/40"
                      : "bg-red-50/80 border-red-200/50 dark:bg-red-900/20 dark:border-red-800/50"
                      }`}
                  >
                    <div
                      className={`text-sm font-medium flex flex-row gap-3 items-center ${isSuccess
                        ? "text-[#00CD56]"
                        : "text-red-600 dark:text-red-400"
                        }`}
                    >
                      {isSuccess ? (
                        <CircleCheck className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <OctagonAlert className="w-5 h-5 flex-shrink-0" />
                      )}
                      <span>{translateMessage(message) || message}</span>
                    </div>
                    <X
                      className={`h-5 w-5 cursor-pointer transition-opacity hover:opacity-70 ${isSuccess ? "text-[#00CD56]" : "text-red-500"
                        }`}
                      onClick={() => setMessage("")}
                    />
                  </div>
                );
              })()}

            {/* Форма за вход */}
            <div className="space-y-5 mb-6">
              {/* Имейл */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Емайл
                </label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-300/50 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              {/* Парола */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Парола
                </label>

                <div className="relative">
                  <input
                    type={passwordShown ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-300/50 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-600 transition duration-150 dark:hover:text-neutral-300"
                  >
                    {passwordShown ? (
                      <EyeOff
                        className="w-5 h-5"
                        onClick={handleTogglePassword}
                      />
                    ) : (
                      <Eye className="w-5 h-5" onClick={handleTogglePassword} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Бутон за вход с имейл */}
            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#00CD56] to-[#00b849] hover:from-[#00b849] hover:to-[#00a341] text-white font-semibold rounded-xl shadow-lg shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/40 dark:hover:shadow-[#00CD56]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mb-4"
            >
              {loading ? (
                "Влизане..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Вход <LogIn className="h-4 w-4" />
                </span>
              )}
            </button>

            {/* Разделител или продължете с друг метод */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300/50 dark:border-neutral-700/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-neutral-900/80 text-neutral-500 dark:text-neutral-400 backdrop-blur-sm">
                  или продължете с
                </span>
              </div>
            </div>

            {/* Бутон за Google вход */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-4 px-6 bg-white dark:bg-neutral-800 border-2 border-neutral-300/50 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Влизане с Google
            </button>

            {/* Линк за регистрация */}
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
              Нямате акаунт?{" "}
              <a
                href="/auth/register"
                className="text-[#00CD56] hover:text-[#00b849] dark:text-[#00CD56] dark:hover:text-[#00e862] font-semibold transition-colors duration-200 hover:underline"
              >
                Регистрирайте се тук
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
