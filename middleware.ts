import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  // Създаваме отговор, който ще върнем в края
  const res = NextResponse.next()

  // Създаваме Supabase клиент за SSR (server-side)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Функция за четене на cookie
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        // Функция за задаване на cookie
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        // Функция за премахване на cookie
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // Вземаме текущата сесия на потребителя
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // Проверка дали страницата е част от auth (логин/регистрация)
  const isAuthPage = pathname.startsWith("/auth")

  // Проверка дали маршрута е защитен (dashboard или частно API)
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/private")

  // Защита на защитените маршрути
  if (isProtectedRoute && !session) {
    // Ако потребителят не е логнат, го пренасочваме към login
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  // Предотвратяване на достъп до auth страници за вече логнати потребители
  if (isAuthPage && session) {
    // Пренасочваме логнатите потребители към dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Връщаме отговора по подразбиране
  return res
}

// Конфигурация за маршрути, на които се прилага middleware-а
export const config = {
  matcher: [
    "/dashboard/:path*",   // Всички dashboard маршрути
    "/api/private/:path*", // Всички private API маршрути
    "/auth/:path*",        // Всички auth маршрути
  ],
}