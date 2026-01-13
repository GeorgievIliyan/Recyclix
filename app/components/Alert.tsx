"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"
import type { JSX } from "react/jsx-runtime" // Import JSX to avoid undeclared variable error

// Типове на алертовете
export type AlertType = "success" | "danger" | "warning" | "info"

// Интерфейс за алерт
export interface Alert {
  id: string
  type: AlertType
  message: string
  duration?: number // в милисекунди, по подразбиране 5000
}

interface AlertNotificationProps {
  alerts: Alert[]
  onDismiss: (id: string) => void
}

// Конфигурация за стилове на различните типове
const alertStyles: Record<AlertType, { bg: string; border: string; icon: JSX.Element }> = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-500",
    icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-500",
    icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-500",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-500",
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  },
}

// Компонент за отделен алерт
function AlertItem({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const style = alertStyles[alert.type]
  const duration = alert.duration ?? 5000

  useEffect(() => {
    // Автоматично скриване след определено време
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(alert.id), 300) // Изчакване на анимацията
    }, duration)

    return () => clearTimeout(timer)
  }, [alert.id, duration, onDismiss])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(alert.id), 300)
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg
        ${style.bg} ${style.border}
        transition-all duration-300 ease-in-out
        ${isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"}
        min-w-[300px] max-w-[400px]
      `}
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">{alert.message}</div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Затваряне"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Главен компонент за показване на алертове
export default function AlertNotification({ alerts, onDismiss }: AlertNotificationProps) {
  if (alerts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  )
}

// Хелпър функция за генериране на уникален ID
export function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}