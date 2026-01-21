"use client"

import { supabase } from "@/lib/supabase-browser"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  // Състояния за имейл, парола, съобщения и зареждане
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Проверка за съобщение след регистрация
  useEffect(() => {
    const msg = sessionStorage.getItem("registrationMessage")
    if (msg) {
      setMessage(msg)
      sessionStorage.removeItem("registrationMessage")
    }
  }, [])

  const handleEmailLogin = async () => {
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    // Проста валидация
    if (!cleanEmail || !cleanPassword) {
      setMessage("Имейл и парола са задължителни.")
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setMessage("Невалиден имейл адрес.")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      })

      if (error) setMessage(error.message)
      else {
        router.push("/app/dashboard")
        router.refresh()
      }
    } catch {
      setMessage("Възникна неочаквана грешка.")
    } finally {
      setLoading(false)
    }
  }

  // Вход чрез Google OAuth
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app/map` },
      })

      if (error) setMessage(error.message)
    } catch (err: any) {
      setMessage("Неуспешен Google вход.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-black p-4">
      <div className="w-full max-w-md">
        <div className="relative backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 md:p-10 overflow-hidden">
          {/* Декоративни кръгове */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00CD56]/20 dark:bg-[#00CD56]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#00CD56]/10 dark:bg-[#00CD56]/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Заглавие и подзаглавие */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-2">
                Влезте в своя профил
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Добре дошли обратно! Моля, въведете вашите данни
              </p>
            </div>

            {/* Съобщение за грешка или информация */}
            {message && (
              <div className="mb-6 p-4 rounded-xl bg-[#00CD56]/10 dark:bg-[#00CD56]/20 border border-[#00CD56]/30 dark:border-[#00CD56]/40">
                <p className="text-sm text-[#00CD56] dark:text-[#00CD56] font-medium">{message}</p>
              </div>
            )}

            {/* Форма за вход */}
            <div className="space-y-5 mb-6">
              {/* Имейл */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Емайл</label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              {/* Парола */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Парола</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Бутон за вход с имейл */}
            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#00CD56] to-[#00b849] hover:from-[#00b849] hover:to-[#00a341] text-white font-semibold rounded-xl shadow-lg shadow-[#00CD56]/30 dark:shadow-[#00CD56]/20 hover:shadow-xl hover:shadow-[#00CD56]/40 dark:hover:shadow-[#00CD56]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mb-4"
            >
              {loading ? "Влизане..." : "Вход"}
            </button>

            {/* Разделител или продължете с друг метод */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300/50 dark:border-gray-700/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 backdrop-blur-sm">
                  или продължете с
                </span>
              </div>
            </div>

            {/* Бутон за Google вход */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-4 px-6 bg-white dark:bg-gray-800 border-2 border-gray-300/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-3"
            >
              Регистрация с Google
            </button>

            {/* Линк за регистрация */}
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
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
  )
}
