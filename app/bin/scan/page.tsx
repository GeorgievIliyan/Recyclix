"use client"

import Camera from "@/app/components/Camera"
import { useState } from "react"
import {
  InspectionPanel,
  Spool,
  Newspaper,
  CameraIcon,
  MousePointer2,
  Trash2,
  BottleWine,
  ShoppingBag,
  Battery,
  PcCase,
  Check
} from "lucide-react"
import Logo36 from "@/app/components/Logo36"

// Тип за материалите в ръчния режим
type Material = {
  id: string
  label: string
  color: string
  icon: any
}

// Налични материали за избор
const materials: Material[] = [
  { id: "plastic", label: "Пластмаса", color: "bg-yellow-500 hover:bg-yellow-600", icon: ShoppingBag },
  { id: "glass", label: "Стъкло", color: "bg-emerald-500 hover:bg-emerald-600", icon: BottleWine },
  { id: "paper", label: "Хартия", color: "bg-blue-500 hover:bg-blue-600", icon: Newspaper },
  { id: "metal", label: "Метал", color: "bg-slate-500 hover:bg-slate-600", icon: InspectionPanel },
  { id: "textile", label: "Текстил", color: "bg-purple-500 hover:bg-purple-600", icon: Spool },
  { id: "general waste", label: "Битов", color: "bg-neutral-500 hover:bg-neutral-600", icon: Trash2 },
  { id: "batteries", label: "Батерии", color: "bg-red-500 hover:bg-red-600", icon: Battery },
  { id: "ewaste", label: "Техника", color: "bg-amber-700 hover:bg-amber-800", icon: PcCase },
]

export default function Page() {
  // Избран материал (ползва се в ръчен режим)
  const [targetMaterial, setTargetMaterial] = useState<string>("")

  // Режим на работа: автоматичен или ръчен
  const [mode, setMode] = useState<"auto" | "manual">("auto")

  // Смяна на режима
  const handleModeChange = (newMode: "auto" | "manual") => {
    setMode(newMode)

    // При авто режим не се задава целеви материал
    if (newMode === "auto") setTargetMaterial("")
  }

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Logo36 />
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#00CD56]">
            Recyclix
          </h1>
        </div>

        {/* Превключване на режим */}
        <div className="inline-flex p-1 bg-muted rounded-lg border border-border shadow-sm">
          <button
            onClick={() => handleModeChange("auto")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              mode === "auto"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CameraIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Авто</span>
          </button>

          <button
            onClick={() => handleModeChange("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              mode === "manual"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MousePointer2 className="w-4 h-4" />
            <span className="text-sm font-medium">Ръчен</span>
          </button>
        </div>
      </div>

      {/* Основно съдържание */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Камера */}
        <div className="flex-1 min-h-0 p-2 sm:p-3 md:p-4">
          <Camera target={targetMaterial} />
        </div>

        {/* Панел с материали (само в ръчен режим) */}
        {mode === "manual" && (
          <div className="flex-shrink-0 md:w-96 md:border-l md:border-border bg-card p-4">
            <MaterialButtons
              materials={materials}
              targetMaterial={targetMaterial}
              setTargetMaterial={setTargetMaterial}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface MaterialButtonsProps {
  materials: Material[]
  targetMaterial: string
  setTargetMaterial: (id: string) => void
}

// Бутони за избор на материал
function MaterialButtons({
  materials,
  targetMaterial,
  setTargetMaterial,
}: MaterialButtonsProps) {
  return (
    <div className="h-full flex flex-col gap-2">
      <h2 className="text-lg font-semibold mb-2">Избор на материал</h2>

      {/* Списък с материали */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-1">
        {materials.map((material) => {
          const IconComponent = material.icon

          return (
            <button
              key={material.id}
              onClick={() => setTargetMaterial(material.id)}
              className={`
                relative w-full flex items-center gap-2 p-3 rounded-lg
                text-white font-medium transition-all active:scale-[0.97]
                ${material.color}
                ${
                  targetMaterial === material.id
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : ""
                }
              `}
            >
              <IconComponent className="w-6 h-6" />
              <span className="flex-1 text-left">{material.label}</span>

              {/* Маркер за избран материал */}
              {targetMaterial === material.id && <Check className="w-5 h-5" />}
            </button>
          )
        })}
      </div>

      {/* Бутон за изчистване на избора */}
      {targetMaterial && (
        <button
          onClick={() => setTargetMaterial("")}
          className="mt-2 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium px-4 py-2.5 rounded-lg"
        >
          Изчисти избора
        </button>
      )}
    </div>
  )
}