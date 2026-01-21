'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { LayoutDashboard, MapPin, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

type Module = 'dashboard' | 'map' | 'tasks'

type NavigationVariant = 'default' | 'compact' | 'transparent'

interface NavigationProps {
  activeModule?: Module
  onModuleChange?: (module: Module) => void
  variant?: NavigationVariant
  autoHideOnScroll?: boolean
  children: ReactNode
}

const modules = [
  {
    id: 'dashboard' as Module,
    label: 'Табло',
    icon: LayoutDashboard,
  },
  {
    id: 'map' as Module,
    label: 'Карта',
    icon: MapPin,
  },
  {
    id: 'tasks' as Module,
    label: 'Задачи',
    icon: ListTodo,
  },
]

export function Navigation({ 
  activeModule = 'dashboard', 
  onModuleChange,
  variant = 'default',
  autoHideOnScroll = false,
  children 
}: NavigationProps) {
  const [scrolled, setScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

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

      setScrolled(currentScrollY > 20)
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, autoHideOnScroll])

  // Determine styling based on variant
  const isCompact = variant === 'compact'
  const isTransparent = variant === 'transparent'
  
  // Desktop height based on variant
  const desktopHeight = isCompact ? 'h-14' : 'h-16'
  
  // Background and border opacity based on variant
  const desktopBg = isTransparent 
    ? 'bg-background/40 border-border/30'
    : 'bg-background/60 border-border/50'
  
  const mobileBg = isTransparent
    ? 'bg-background/40 border-border/30'
    : 'bg-background/60 border-border/50'

  return (
    <>
      <nav
        className={cn(
          'hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          desktopHeight
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-7xl h-full px-6',
            'backdrop-blur-xl border-b transition-all duration-300',
            desktopBg,
            scrolled && variant === 'default' && 'bg-background/80 shadow-sm'
          )}
        >
          <div className="flex items-center justify-center h-full gap-2">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = activeModule === module.id

              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange?.(module.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-xl',
                    'transition-all duration-200 text-sm font-medium',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{module.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
      
      <nav
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50',
          'transition-all duration-300',
          isVisible ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div
          className={cn(
            'backdrop-blur-xl border-t transition-all duration-300',
            mobileBg,
            'safe-bottom'
          )}
        >
          <div className="flex items-center justify-around px-6 py-3">
            {modules.map((module) => {
              const Icon = module.icon
              const isActive = activeModule === module.id

              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange?.(module.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-6 py-2 rounded-xl min-w-[72px]',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
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
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
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

      <div className={cn(
        'min-h-screen',
        isCompact ? 'pt-14 md:pt-14' : 'pt-16 md:pt-16',
        'pb-20 md:pb-0'
      )}>
        {children}
      </div>
    </>
  )
}
