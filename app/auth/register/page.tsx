"use client";

import { supabase } from "@/lib/supabase-browser";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, OctagonAlert, CircleCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RecyclingLoader } from "@/app/components/ui/RecyclingLoader";

const sanitize = {
  email: (email: string): string | null => {
    if (!email) return null;
    const sanitized = email.trim().toLowerCase().substring(0, 254);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) return null;
    return sanitized;
  },

  password: (
    password: string,
    tooShortMsg: string,
    tooLongMsg: string,
  ): { isValid: boolean; message?: string } => {
    if (!password || password.length < 6)
      return { isValid: false, message: tooShortMsg };
    if (password.length > 100)
      return { isValid: false, message: tooLongMsg };
    return { isValid: true };
  },

  fullName: (name: string): string => {
    if (!name) return "";
    return name
      .trim()
      .replace(/[<>]/g, "")
      .replace(/[^a-zA-Zа-яА-Я\s\-'\.]/g, "")
      .replace(/\s+/g, " ")
      .substring(0, 100);
  },
};

interface PasswordStrength {
  score: number;
  label: string;
  barColor: string;
}

function getPasswordStrength(
  password: string,
  labels: Record<string, string>,
): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const barColors: Record<number, string> = {
    0: "bg-red-500",
    1: "bg-orange-500",
    2: "bg-yellow-500",
    3: "bg-[#00CD56]",
    4: "bg-emerald-500",
  };

  return { score, label: labels[score] ?? "", barColor: barColors[score] ?? "bg-red-500" };
}

function RegisterPage() {
  const { t } = useTranslation("common");

  const [mounted, setMounted] = useState<Boolean>(false)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [passwordShown, setPasswordShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const strengthLabels: Record<number, string> = {
    0: t("auth.register.passwordStrengthLevels.0"),
    1: t("auth.register.passwordStrengthLevels.1"),
    2: t("auth.register.passwordStrengthLevels.2"),
    3: t("auth.register.passwordStrengthLevels.3"),
    4: t("auth.register.passwordStrengthLevels.4"),
  };

  const passwordRequirements: { label: string; test: (p: string) => boolean }[] = [
    {
      label: t("auth.register.passwordRequirements.minChars"),
      test: (p) => p.length >= 8,
    },
    {
      label: t("auth.register.passwordRequirements.uppercase"),
      test: (p) => /[A-Z]/.test(p),
    },
    {
      label: t("auth.register.passwordRequirements.number"),
      test: (p) => /[0-9]/.test(p),
    },
    {
      label: t("auth.register.passwordRequirements.specialChar"),
      test: (p) => /[^A-Za-z0-9]/.test(p),
    },
  ];

  const translateMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower === "invalid login credentials")
      return t("auth.register.messages.invalidCredentials");
    if (lower === "invalid input")
      return t("auth.register.messages.invalidInput");
    return msg;
  };

  const isSuccessMessage = (msg: string): boolean =>
    msg === t("auth.register.messages.registrationSuccess") ||
    msg === t("auth.register.messages.googleRedirect");

  const strength = password
    ? getPasswordStrength(password, strengthLabels)
    : null;

  const handleTogglePassword = () => setPasswordShown((prev) => !prev);

  const handleRegister = async () => {
    setPasswordShown(false);
    setLoading(true);
    setMessage(null);

    if (!email || !password) {
      setMessage(t("auth.register.messages.requiredFields"));
      setLoading(false);
      return;
    }

    const sanitizedEmail = sanitize.email(email);
    if (!sanitizedEmail) {
      setMessage(t("auth.register.messages.invalidEmail"));
      setLoading(false);
      return;
    }

    const passwordValidation = sanitize.password(
      password,
      t("auth.register.messages.passwordTooShort"),
      t("auth.register.messages.passwordTooLong"),
    );
    if (!passwordValidation.isValid) {
      setMessage(
        passwordValidation.message ?? t("auth.register.messages.unexpectedError"),
      );
      setLoading(false);
      return;
    }

    const sanitizedFullName = sanitize.fullName(fullName);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          fullName: sanitizedFullName,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error(t("auth.register.messages.unexpectedError"));
      }

      const data = await res.json();

      if (res.ok) {
        setEmail("");
        setPassword("");
        setFullName("");
        sessionStorage.setItem(
          "registrationMessage",
          t("auth.register.messages.registrationSuccess"),
        );
        router.push("/auth/login");
      } else {
        setMessage(data.error || t("auth.register.messages.registrationFailed"));
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setMessage(t("auth.register.messages.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        setMessage(error.message);
      } else {
        setMessage(t("auth.register.messages.googleRedirect"));
      }
    } catch (err: unknown) {
      console.error("Google registration error:", err);
      setMessage(t("auth.register.messages.googleFail"));
    }
  };

  const handleInputChange = (
    type: "email" | "password" | "fullName",
    value: string,
  ) => {
    if (type === "email") setEmail(value);
    else if (type === "password") setPassword(value);
    else setFullName(sanitize.fullName(value));
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RecyclingLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-black p-4">
      <div className="w-full max-w-md">
        <div className="relative backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-3xl shadow-2xl dark:shadow-[0_0_50px_rgba(0,205,86,0.1)] border border-neutral-200/50 dark:border-neutral-800/50 p-8 md:p-10 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00CD56]/20 dark:bg-[#00CD56]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#00CD56]/10 dark:bg-[#00CD56]/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 dark:from-white dark:via-neutral-100 dark:to-white bg-clip-text text-transparent mb-2">
                {t("auth.register.pageTitle")}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                {t("auth.register.welcomeMessage")}
              </p>
            </div>

            {/* Message banner */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${isSuccessMessage(message)
                  ? "bg-[#00CD56]/10 border-[#00CD56]/30 dark:bg-[#00CD56]/20 dark:border-[#00CD56]/40"
                  : "bg-red-50/80 border-red-200/50 dark:bg-red-900/20 dark:border-red-800/50"
                  }`}
              >
                <div
                  className={`text-sm font-medium flex flex-row gap-3 items-center ${isSuccessMessage(message)
                    ? "text-[#00CD56]"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {isSuccessMessage(message) ? (
                    <CircleCheck className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <OctagonAlert className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{translateMessage(message)}</span>
                </div>
                <X
                  className={`h-5 w-5 cursor-pointer transition-opacity hover:opacity-70 ${isSuccessMessage(message) ? "text-[#00CD56]" : "text-red-500"
                    }`}
                  onClick={() => setMessage("")}
                />
              </div>
            )}

            <div className="space-y-5 mb-6">
              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t("auth.register.fullNameLabel")}
                </label>
                <input
                  type="text"
                  placeholder={t("auth.register.fullNamePlaceholder")}
                  value={fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-3.5 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-300/50 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t("auth.register.emailLabel")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder={t("auth.register.emailPlaceholder")}
                  value={email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  maxLength={254}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-300/50 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t("auth.register.passwordLabel")}
                </label>
                <div className="relative">
                  <input
                    type={passwordShown ? "text" : "password"}
                    placeholder={t("auth.register.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-300/50 dark:border-neutral-700/50 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-[#00CD56] transition duration-150"
                    onClick={handleTogglePassword}
                  >
                    {passwordShown ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Strength bar */}
                {passwordFocused && password.length > 0 && strength && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength.score
                            ? strength.barColor
                            : "bg-neutral-200 dark:bg-neutral-700"
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {t("auth.register.passwordStrength")}:{" "}
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">
                        {strength.label}
                      </span>
                    </p>
                  </div>
                )}

                {/* Requirements checklist */}
                {passwordFocused && (
                  <div className="rounded-xl bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 p-3 space-y-1.5">
                    {passwordRequirements.map(({ label, test }) => {
                      const met = test(password);
                      return (
                        <div key={label} className="flex items-center gap-2">
                          <span
                            className={`inline-block size-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${met
                              ? "bg-[#00CD56] shadow-sm shadow-[#00CD56]/60"
                              : "bg-neutral-300 dark:bg-neutral-600"
                              }`}
                          />
                          <p
                            className={`text-xs transition-colors duration-200 ${met
                              ? "text-neutral-700 dark:text-neutral-200"
                              : "text-neutral-400 dark:text-neutral-500"
                              }`}
                          >
                            {label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Register button */}
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#00CD56] to-[#00b849] hover:from-[#00b849] hover:to-[#00a341] text-white font-semibold rounded-xl shadow-lg shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/40 dark:hover:shadow-[#00CD56]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("auth.register.registering")}
                </span>
              ) : (
                t("auth.register.registerButton")
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300/50 dark:border-neutral-700/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-neutral-900/80 text-neutral-500 dark:text-neutral-400 backdrop-blur-sm">
                  {t("auth.register.orContinueWith")}
                </span>
              </div>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleRegister}
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
              {t("auth.register.registerWithGoogle")}
            </button>

            {/* Login link */}
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-6">
              {t("auth.register.alreadyHaveAccount")}{" "}
              <a
                href="/auth/login"
                className="text-[#00CD56] hover:text-[#00b849] dark:text-[#00CD56] dark:hover:text-[#00e862] font-semibold transition-colors duration-200 hover:underline"
              >
                {t("auth.register.loginHere")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;