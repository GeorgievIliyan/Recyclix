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
      <div className="hidden md:flex fixed top-5 left-0 right-0 z-[100] justify-center pointer-events-none">
        <nav className={cn(
          "pointer-events-auto relative flex items-center gap-1 p-1.5 rounded-full transition-all duration-200",
          "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-[45px]",
          "border border-white/40 dark:border-white/10", 
          "shadow-[0_20px_50px_rgba(0,0,0,0.1),0_1px_1px_rgba(255,255,255,0.3)_inset]",
          "dark:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_1px_0px_rgba(255,255,255,0.05)_inset]",
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
                    layout
                    className={cn(
                      "absolute inset-0 z-0 rounded-full",
                      "bg-gradient-to-tr from-emerald-500/90 to-emerald-400/90 dark:from-emerald-600/80 dark:to-emerald-500/80",
                      "border border-white/20 shadow-[0_4px_15px_rgba(16,185,129,0.3)]"
                    )}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                
                <Icon className={cn("relative z-10 h-4 w-4 transition-transform duration-300", isActive && "scale-110")} />
                <span className="relative z-10 tracking-tight">{module.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={cn(
        "md:hidden fixed bottom-8 left-0 right-0 z-[100] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] px-8",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-28 opacity-0"
      )}>
        <nav className={cn(
          "mx-auto flex items-center justify-around p-3 rounded-[35px]",
          "bg-white/40 dark:bg-zinc-950/50 backdrop-blur-[45px]",
          "border border-white/40 dark:border-white/10",
          "shadow-[0_15px_45px_rgba(0,0,0,0.15),0_1px_2px_rgba(255,255,255,0.3)_inset]",
          "dark:shadow-[0_25px_65px_rgba(0,0,0,0.6),0_1px_1px_rgba(255,255,255,0.05)_inset]",
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
                  "relative flex flex-col items-center justify-center min-w-[65px] transition-all duration-300",
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"
                )}
              >
                <div className="relative p-2">
                  <Icon className={cn(
                    "h-6 w-6 transition-all duration-200", 
                    isActive ? "scale-110 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "scale-100 opacity-70"
                  )} />
                  
                  {isActive && (
                    <motion.div
                      layoutId="mobile-glow"
                      layout
                      className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full z-[-1]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>

                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.12em] transition-all duration-200",
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}>
                  {module.label}
                </span>

                {isActive && (
                  <motion.div 
                    layoutId="mobile-dot"
                    layout
                    className="absolute -bottom-1 w-2 h-[2px] bg-emerald-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </LayoutGroup>
  )
}