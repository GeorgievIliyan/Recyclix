'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, ListTodo, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Module = 'dashboard' | 'map' | 'tasks' | 'account'
type NavigationVariant = 'default' | 'compact' | 'transparent'

interface NavigationProps {
  variant?: NavigationVariant
  autoHideOnScroll?: boolean
  className?: string
}

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

export function Navigation({
  variant = 'default',
  autoHideOnScroll = false,
  className,
}: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  
  const getActiveModule = (): Module => {
    if (pathname?.startsWith('/app/dashboard')) return 'dashboard'
    if (pathname?.startsWith('/app/map')) return 'map'
    if (pathname?.startsWith('/app/tasks')) return 'tasks'
    if (pathname?.startsWith('/auth/account')) return 'account'
    return 'dashboard'
  }
  
  const activeModule = getActiveModule()

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (autoHideOnScroll && window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false)
        } else {
          setIsVisible(true)
        }
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, autoHideOnScroll])

  const isCompact = variant === 'compact'
  const isTransparent = variant === 'transparent'

  const desktopHeight = isCompact ? 'h-14' : 'h-16'

  // ефекти за стъкло
  const desktopBg = isTransparent
    ? 'bg-white/15 dark:bg-neutral-900/15 border border-white/15 dark:border-neutral-700/15 backdrop-blur-md'
    : 'bg-white/50 dark:bg-neutral-900/50 border border-white/20 dark:border-neutral-700/20 backdrop-blur-md shadow-sm'

  const mobileBg = isTransparent
    ? 'bg-white/15 dark:bg-neutral-900/15 border-t border-white/15 dark:border-neutral-700/15 backdrop-blur-md'
    : 'bg-white/50 dark:bg-neutral-900/50 border-t border-white/20 dark:border-neutral-700/20 backdrop-blur-md shadow-sm'
  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <>
      {/* за десктоп */}
      <nav
        className={cn(
          'hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          desktopHeight,
          className
        )}
      >
        <div
          className={cn(
            'w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2',
            desktopBg,
            'before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:dark:from-neutral-900/10'
          )}
        >
          {modules.map((module) => {
            const Icon = module.icon
            const isActive = activeModule === module.id

            return (
              <button
                key={module.id}
                onClick={() => handleNavigation(module.path)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl transition-all duration-200 text-sm font-medium relative',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'hover:bg-white/30 dark:hover:bg-neutral-800/30',
                  isActive
                    ? 'bg-green-500/90 text-primary-foreground shadow-lg shadow-primary/20 backdrop-blur-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{module.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* за телефони */}
      <nav
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300',
          isVisible ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        <div
          className={cn(
            'backdrop-blur-2xl',
            mobileBg,
            'safe-bottom',
            'before:absolute before:inset-0 before:bg-gradient-to-t before:from-white/10 before:to-transparent before:dark:from-neutral-900/10' // Extra glass gradient
          )}
        >
          <div className="flex items-center justify-around px-4 py-3 relative">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = activeModule === module.id

              return (
                <button
                  key={module.id}
                  onClick={() => handleNavigation(module.path)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[72px] transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'hover:bg-white/30 dark:hover:bg-neutral-800/30',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={module.label}
                >
                  <div
                    className={cn(
                      'relative transition-all duration-200',
                      isActive && 'scale-110'
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/80 backdrop-blur-sm" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium transition-all duration-200',
                      isActive ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    {module.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}