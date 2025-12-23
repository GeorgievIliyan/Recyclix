"use client"

import { supabase } from "@/lib/supabase-browser"
import { useState, useEffect } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const msg = sessionStorage.getItem("registrationMessage")
    if (msg) {
      setMessage(msg)
      sessionStorage.removeItem("registrationMessage")
    }
  }, [])

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setMessage("Имейл и парола са задължителни.")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        window.location.href = "/dashboard"
      }
    } catch (err: any) {
      setMessage("Възникна неочаквана грешка.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
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
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00CD56]/20 dark:bg-[#00CD56]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#00CD56]/10 dark:bg-[#00CD56]/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-2">
                Влезте в своя профил
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Добре дошли обратно! Моля, въведете вашите данни
              </p>
            </div>

            {message && (
              <div className="mb-6 p-4 rounded-xl bg-[#00CD56]/10 dark:bg-[#00CD56]/20 border border-[#00CD56]/30 dark:border-[#00CD56]/40">
                <p className="text-sm text-[#00CD56] dark:text-[#00CD56] font-medium">{message}</p>
              </div>
            )}

            <div className="space-y-5 mb-6">
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

            <button
              onClick={handleEmailLogin}
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
                  Влизане...
                </span>
              ) : (
                "Вход"
              )}
            </button>

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

            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 px-6 bg-white dark:bg-gray-800 border-2 border-gray-300/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-3"
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
              Регистрация с Google
            </button>

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