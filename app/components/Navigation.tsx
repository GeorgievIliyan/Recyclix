"use client"

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, MapPin, ListTodo, User } from 'lucide-react'
import { motion, LayoutGroup } from 'framer-motion'
import { cn } from '@/lib/utils'

type Module = 'dashboard' | 'map' | 'tasks' | 'account'

interface ModuleItem {
  id: Module
  label: string
  icon: any
  path: string
}

const modules: ModuleItem[] = [
  { id: 'dashboard', label: 'Табло', icon: LayoutDashboard, path: '/app/dashboard' },
  { id: 'map', label: 'Карта', icon: MapPin, path: '/app/map' },
  { id: 'tasks', label: 'Задачи', icon: ListTodo, path: '/app/tasks' },
  { id: 'account', label: 'Акаунт', icon: User, path: '/auth/account' },
]

export function Navigation({ className }: { className?: string }) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const activeModule = modules.find(m => pathname?.startsWith(m.path))?.id || 'dashboard'

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
          setIsVisible(false)
        } else if (currentScrollY < lastScrollY.current) {
          setIsVisible(true)
        }
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <LayoutGroup>
      {/* навигация за десктоп */}
      <div className="hidden md:flex fixed top-5 left-0 right-0 z-[100] justify-center pointer-events-none">
        <nav className={cn(
          "pointer-events-auto relative flex items-center gap-1 p-1.5 rounded-full transition-all duration-200",
          "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-[10px]",
          "border border-white/40 dark:border-white/10 shadow-lg",
          className
        )}>
          {modules.map((module) => {
            const isActive = activeModule === module.id
            const Icon = module.icon
            return (
              <Link
                key={module.id}
                href={module.path}
                className={cn(
                  "relative flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                  isActive ? "text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-pill"
                    className="absolute inset-0 z-0 rounded-full bg-gradient-to-tr from-green-500 to-green-400 border border-white/20"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{module.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* За мобилни у-ва*/}
      <div className={cn(
        "md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      )}>
        <nav className={cn(
          "flex items-center gap-10 px-9 py-3 rounded-full",
          "bg-white/70 dark:bg-zinc-900/85 backdrop-blur-2xl",
          "border border-white/30 dark:border-white/10",
          "shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
          className
        )}>
          {modules.map((module) => {
            const isActive = activeModule === module.id
            const Icon = module.icon

            return (
              <Link
                key={module.id}
                href={module.path}
                className={cn(
                  "relative flex items-center justify-center transition-all duration-300",
                  isActive ? "text-green-500" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "scale-100 opacity-80"
                  )} />
                  
                  {isActive && (
                    <motion.div 
                      layoutId="mobile-dot"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>
    </LayoutGroup>
  )
}