"use client"

import BinCamera from "@/app/components/BinCamera"
import { useState } from "react"
import { supabase } from "@/lib/supabase-browser"
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
  Check,
  OctagonAlert,
  Eraser
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
  { id: "plastic", label: "Пластмаса", color: "bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700", icon: ShoppingBag },
  { id: "glass", label: "Стъкло", color: "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700", icon: BottleWine },
  { id: "paper", label: "Хартия", color: "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700", icon: Newspaper },
  { id: "metal", label: "Метал", color: "bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700", icon: InspectionPanel },
  { id: "textile", label: "Текстил", color: "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700", icon: Spool },
  { id: "general waste", label: "Битов", color: "bg-gradient-to-br from-neutral-500 to-neutral-600 hover:from-neutral-600 hover:to-neutral-700", icon: Trash2 },
  { id: "batteries", label: "Батерии", color: "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700", icon: Battery },
  { id: "ewaste", label: "Техника", color: "bg-gradient-to-br from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900", icon: PcCase },
]

const isDev = process.env.NODE_ENV === "development"

export default function Page() {
  // Избран материал (ползва се в ръчен режим)
  const [targetMaterial, setTargetMaterial] = useState<string>("")

  // Режим на работа: автоматичен или ръчен
  const [mode, setMode] = useState<"auto" | "manual">("auto")

  // за модала за въвеждане на id
  const [code, setCode] = useState<string>("")
  const [opened, setOpened] = useState<boolean | null>(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // за QR кода
  const [qr, setQr] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null)

  // Смяна на режима
  const handleModeChange = (newMode: "auto" | "manual") => {
    setMode(newMode)

    // При авто режим не се задава целеви материал
    if (newMode === "auto") setTargetMaterial("")
  }

  // функция за проверка в база данни:
  const handleCodeSubmit = async (inputCode: string) => {
    setCodeError(null);

    if (!inputCode) {
      setCodeError("Моля, въведете код!");
      return;
    }

    const trimmedCode = inputCode.trim();

    if (trimmedCode.length !== 6) {
      setCodeError("Кодът трябва да е 6 символа дълъг!");
      return;
    }

    try {
      // Use the correct table name 'recycling_bins' from your schema
      const { data, error } = await supabase
        .from('recycling_bins')
        .select('id, code') 
        .eq('code', trimmedCode) 
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error.message);
        setCodeError("Грешка при връзка с базата данни.");
        return;
      }

      if (data) {
        // SUCCESS:
        // 1. Update the code state first
        setCode(trimmedCode); 
        // 2. Open the camera UI
        setOpened(true); 
        console.log("Connected to bin ID:", data.id);
      } else {
        setCodeError("Кодът не бе намерен!");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setCodeError("Възникна неочаквана грешка.");
    }
  };

  return (
    <>
    {opened? 
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
          {opened && <BinCamera target={targetMaterial} binId={code.trim()} />}
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
    :
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-white px-4 antialiased dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-2 text-center">
        {/* Заглавие */}
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Въведете код на кош
        </h1>
        
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          Моля, въведете 6-цифрения код, за да продължите напред
        </p>

        {codeError && 
          <span className="text-red-500 bg-red-500/15 rounded-full text-md inline-flex gap-2 py-2 px-2.5"><OctagonAlert /> {codeError}</span>
        }

        {/* Поле за въвеждане */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Напр. 4K3NWX"
            value={code}
            className="flex h-12 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-center text-lg ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
            onChange={(e) => setCode(e.target.value)}
          />
          <button 
            className="inline-flex gap-1 h-10 w-full 
            items-center justify-center rounded-md 
            bg-[#00CD56] px-4 py-2 text-sm font-medium 
            text-neutral-50 transition-colors 
            hover:bg-[#00CD56]/90 focus-visible:outline-none 
            focus-visible:ring-2 focus-visible:ring-neutral-950 
            disabled:pointer-events-none disabled:opacity-50"
            onClick={() => handleCodeSubmit(code)}
          >
              Потвърди <Check className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
    }
    </>
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
      <div className="grid grid-cols-1 gap-2 md:grid-cols-1 md:h-full">
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
                ${targetMaterial === material.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                md:flex-1 md:h-full
              `}
            >
              <IconComponent className="w-6 h-6 md:h-7 md:w-7 lg:w-8 lg:h-8" />
              <span className="flex-1 text-left lg:text-[18px]">{material.label}</span>

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
          className="mt-2 w-full bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary text-secondary-foreground font-medium px-4 py-2.5 rounded-lg flex items-center justify-center"
        >
          Изчисти избора <Eraser className="w-5 h-5 ml-2" />
        </button>
      )}
    </div>
  )
}