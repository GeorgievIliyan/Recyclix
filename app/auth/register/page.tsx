"use client"

import { supabase } from "@/lib/supabase-browser"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, OctagonAlert, CircleCheck, X } from "lucide-react"

const translateMessage = (message: string) => {
  if (message.toLowerCase() == "invalid login credentials"){
    return "Грешна парола или имейл"
  }
  if (message.toLowerCase() == "invalid input"){
    return "Грешни данни или потребителят несъществува"
  }
}

// Дезинфекция на данните
const sanitize = {
  string: (input: string): string => {
    if (!input) return ""
    
    return input
      .trim()
      .replace(/[<>]/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .substring(0, 255)
  },

  // валидация на имейл
  email: (email: string): string | null => {
    if (!email) return null
    
    const sanitized = email.trim().toLowerCase().substring(0, 254)
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(sanitized)) {
      return null
    }
    
    return sanitized
  },

  // Валидация на парола
  password: (password: string): { isValid: boolean; message?: string } => {
    if (!password || password.length < 6) {
      return { isValid: false, message: "Паролата трябва да е най-малко 6 знака." }
    }
    
    if (password.length > 100) {
      return { isValid: false, message: "Паролата е твърде дълга." }
    }
    
    return { isValid: true }
  },

  fullName: (name: string): string => {
    if (!name) return ""
    
    return name
      .trim()
      .replace(/[<>]/g, "")
      .replace(/[^a-zA-Zа-яА-Я\s\-'\.]/g, "")
      .replace(/\s+/g, ' ')
      .substring(0, 100)
  }
}

function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [passwordShown, setPasswordShown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()

  const handleTogglePassword = () => {
    setPasswordShown(!passwordShown)
  }

  const handleRegister = async () => {
    setPasswordShown(false)
    setLoading(true)
    setMessage(null)

    // Валидации
    if (!email || !password) {
      setMessage("Имейл и парола са задължителни.")
      setLoading(false)
      return
    }

    const sanitizedEmail = sanitize.email(email)
    if (!sanitizedEmail) {
      setMessage("Моля, въведете валиден имейл адрес.")
      setLoading(false)
      return
    }

    const passwordValidation = sanitize.password(password)
    if (!passwordValidation.isValid) {
      setMessage(passwordValidation.message || "Невалидна парола.")
      setLoading(false)
      return
    }

    const sanitizedFullName = sanitize.fullName(fullName)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest" // Против AJAX заявки
        },
        body: JSON.stringify({ 
          email: sanitizedEmail, 
          password, 
          fullName: sanitizedFullName 
        }),
      })

      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Неочакван отговор от сървъра.")
      }

      const data = await res.json()

      if (res.ok) {
        setEmail("")
        setPassword("")
        setFullName("")
        sessionStorage.setItem(
          "registrationMessage",
          "Регистрацията е успешна! Моля, проверете имейла си, за да потвърдите акаунта си преди влизане."
        )
        router.push("/auth/login")
      } else {
        setMessage(data.error || "Регистрацията неуспешна.")
      }
    } catch (err: any) {
      console.error("Registration error:", err)
      setMessage("Възникна неочаквана грешка. Моля, опитайте отново.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: window.location.origin + "/dashboard",
          queryParams: {
            prompt: "select_account"
          }
        },
      })

      if (error) {
        console.error("Google OAuth error:", error)
        setMessage(error.message)
      } else {
        setMessage("Пренасочване към Google...")
      }
    } catch (err: any) {
      console.error("Google registration error:", err)
      setMessage("Неуспешна регистрация с Google.")
    }
  }

  const handleInputChange = (type: 'email' | 'password' | 'fullName', value: string) => {
    switch (type) {
      case 'email':
        setEmail(value)
        break
      case 'password':
        setPassword(value)
        break
      case 'fullName':
        setFullName(sanitize.fullName(value))
        break
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-black p-4">
      <div className="w-full max-w-md">
        <div className="relative backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl dark:shadow-[0_0_50px_rgba(0,205,86,0.1)] border border-gray-200/50 dark:border-gray-800/50 p-8 md:p-10 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00CD56]/20 dark:bg-[#00CD56]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#00CD56]/10 dark:bg-[#00CD56]/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-2">
                Създайте акаунт
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Започнете умното рециклиране днес
              </p>
            </div>

            {/* Съобщение за грешка или информация */}
            {message && (() => {
              const isSuccess = message.includes("успеш") || message.includes("Пренасочване");

              return (
                <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
                  isSuccess 
                    ? "bg-[#00CD56]/10 border-[#00CD56]/30 dark:bg-[#00CD56]/20 dark:border-[#00CD56]/40"
                    : "bg-red-50/80 border-red-200/50 dark:bg-red-900/20 dark:border-red-800/50"
                }`}>
                  <div className={`text-sm font-medium flex flex-row gap-3 items-center ${
                    isSuccess ? "text-[#00CD56]" : "text-red-600 dark:text-red-400"
                  }`}>
                    {isSuccess ? (
                      <CircleCheck className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <OctagonAlert className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span>{translateMessage(message) || message}</span>
                  </div>
                  <X 
                    className={`h-5 w-5 cursor-pointer transition-opacity hover:opacity-70 ${
                      isSuccess ? "text-[#00CD56]" : "text-red-500"
                    }`} 
                    onClick={() => setMessage("")}
                  />
                </div>
              );
            })()}

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пълно име
                  <span className="text-gray-400 text-xs ml-1">(незадължително)</span>
                </label>
                <input
                  type="text"
                  placeholder="Иван Иванов"
                  value={fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имейл <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="vashe.ime@example.com"
                  value={email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  maxLength={254}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              <div className="relative">
                  <input
                    type={passwordShown? "text": "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00CD56]/50 dark:focus:ring-[#00CD56]/40 focus:border-[#00CD56] dark:focus:border-[#00CD56] transition-all duration-200 backdrop-blur-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition duration-150 dark:hover:text-gray-300"
                  >
                    {passwordShown? 
                      <EyeOff className="w-5 h-5" onClick={handleTogglePassword}/>
                      :
                      <Eye className="w-5 h-5" onClick={handleTogglePassword}/>
                    }
                  </button>
                </div>
            </div>

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
                  Създаване на акаунт...
                </span>
              ) : (
                "Регистрация"
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
              onClick={handleGoogleRegister}
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
              Вече имате акаунт?{" "}
              <a
                href="/auth/login"
                className="text-[#00CD56] hover:text-[#00b849] dark:text-[#00CD56] dark:hover:text-[#00e862] font-semibold transition-colors duration-200 hover:underline"
              >
                Влезте тук
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage