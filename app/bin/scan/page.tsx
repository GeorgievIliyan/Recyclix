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
  OctagonAlert
} from "lucide-react"
import Logo36 from "@/app/components/Logo36"
import { QRCodeSVG } from 'qrcode.react';

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
  const handleCodeSubmit = async (code: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (code.length == 0){
      setCodeError("Моля, въведете код!")
      return 
    }

    if (code.length < 6 || code.length > 6 ) {
      setCodeError("Кодът трябва да е 6 символа дълъг!")
      return
    }
    // проверка в база данни
    try {
      const { data, error } = await supabase
        .from('recycling_bins')
        .select('*') 
        .eq('code', code.trim()) 
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error.message);
        return;
      }

      //проверка за открит резултат
      if (data) {
        setOpened(true);
        console.log("Connected to bin:", data.id)

      // Then in your handleCodeSubmit function:
      try {
        // Only include API key in development
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        // Add API key only in development
        if (isDev && process.env.NEXT_PUBLIC_SECURE_API_KEY) {
          headers["x-api-key"] = process.env.NEXT_PUBLIC_SECURE_API_KEY;
        } else if (!isDev) {
          // In production, you should implement a proper solution
          console.warn("Running in production without secure API implementation");
          // Consider implementing a fallback or showing an error
        }

        const res = await fetch('/api/temporary-qr', {
          method: "POST",
          headers,
          body: JSON.stringify({
            userId: user?.id,
            points: 5
          })
        });

        const qrData = await res.json();
        
        // You'll likely get a 401 Unauthorized in production
        if (!res.ok) {
          console.error("QR generation failed:", qrData.error || "Unauthorized");
          // Handle error appropriately for your users
          alert("QR кодът не може да бъде генериран в момента. Моля, опитайте по-късно.");
          return;
        }
        
        if (qrData.token) {
          setQr(qrData.token);
          setQrExpiresAt(qrData.expiresAt);
        }
      } catch(err) {
        console.error("QR generation error: ", err);
        
        // Show user-friendly error
        if (err instanceof Error) {
          alert(`Грешка: ${err.message}`);
        } else {
          alert("Възникна грешка при генериране на QR кода.");
        }
      }
      } else {
        setCodeError("Кодът не бе намерен!")
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }

  }

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
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Заглавие */}
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Въведете код на кош
        </h1>
        
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Моля, въведете 6-цифрения код, за да продължите напред
        </p>

        {codeError && 
          <span className="text-red-700 bg-red-500/10 rounded-full text-md inline-flex gap-2 py-2 px-2.5"><OctagonAlert /> {codeError}</span>
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
          className="mt-2 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium px-4 py-2.5 rounded-lg"
        >
          Изчисти избора
        </button>
      )}
    </div>
  )
}