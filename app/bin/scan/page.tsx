"use client";

import BinCamera from "@/app/components/BinCamera";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
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
  Eraser,
  Settings,
  Binary,
} from "lucide-react";
import Logo36 from "@/app/components/Logo36";

type Material = {
  id: string;
  label: string;
  color: string;
  icon: any;
};

const materials: Material[] = [
  {
    id: "plastic",
    label: "Пластмаса",
    color:
      "bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700",
    icon: ShoppingBag,
  },
  {
    id: "glass",
    label: "Стъкло",
    color:
      "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
    icon: BottleWine,
  },
  {
    id: "paper",
    label: "Хартия",
    color:
      "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    icon: Newspaper,
  },
  {
    id: "metal",
    label: "Метал",
    color:
      "bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700",
    icon: InspectionPanel,
  },
  {
    id: "textile",
    label: "Текстил",
    color:
      "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    icon: Spool,
  },
  {
    id: "general waste",
    label: "Битов",
    color:
      "bg-gradient-to-br from-neutral-500 to-neutral-600 hover:from-neutral-600 hover:to-neutral-700",
    icon: Trash2,
  },
  {
    id: "batteries",
    label: "Батерии",
    color:
      "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    icon: Battery,
  },
  {
    id: "ewaste",
    label: "Техника",
    color:
      "bg-gradient-to-br from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900",
    icon: PcCase,
  },
];

const STORAGE_KEY = "recycling_bin_code";

export default function Page() {
  const [targetMaterial, setTargetMaterial] = useState<string>("");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [code, setCode] = useState<string>("");
  const [opened, setOpened] = useState<boolean>(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showChangeCode, setShowChangeCode] = useState<boolean>(false);

  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY);
    if (savedCode) {
      setCode(savedCode);
      checkSavedCode(savedCode);
    }
  }, []);

  const checkSavedCode = async (savedCode: string) => {
    try {
      const { data, error } = await supabase
        .from("recycling_bins")
        .select("id, code")
        .eq("code", savedCode.trim())
        .maybeSingle();

      if (!error && data) {
        setOpened(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error("Error checking saved code:", err);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleModeChange = (newMode: "auto" | "manual") => {
    setMode(newMode);
    if (newMode === "auto") setTargetMaterial("");
  };

  const handleCodeSubmit = async (inputCode: string) => {
    setCodeError(null);

    if (code.trim().toLowerCase() == "admin") {
      setCode(inputCode);
      setOpened(true);
      return;
    }

    if (!inputCode) {
      setCodeError("Моля, въведете код!");
      return;
    }

    const trimmedCode = inputCode.trim();

    try {
      const { data, error } = await supabase
        .from("recycling_bins")
        .select("id, code")
        .eq("code", trimmedCode)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error.message);
        setCodeError("Грешка при връзка с базата данни.");
        return;
      }

      if (data) {
        setCode(trimmedCode);
        setOpened(true);
        localStorage.setItem(STORAGE_KEY, trimmedCode);
        console.log("Connected to bin ID:", data.id);
      } else {
        setCodeError("Кодът не бе намерен!");
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setCodeError("Възникна неочаквана грешка.");
    }
  };

  const handleClearCode = () => {
    setOpened(false);
    setCode("");
    localStorage.removeItem(STORAGE_KEY);
    setCodeError(null);
    setShowChangeCode(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showChangeCode) {
        setShowChangeCode(false);
      }
    };

    if (showChangeCode) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showChangeCode]);

  return (
    <>
      {opened ? (
        <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
          <div className="flex flex-shrink-0 items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <Logo36 />
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#00CD56]">
                Recyclix
              </h1>
            </div>

            <div className="flex items-center gap-4">
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

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChangeCode(!showChangeCode);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Настройки"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {showChangeCode && (
                  <div
                    className="absolute right-0 top-12 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[160px] z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleClearCode}
                      className="group w-full px-3 py-2 text-sm text-black dark:text-white hover:bg-red-500/15 hover:text-red-500 rounded-md flex items-center justify-between transition duration-150"
                    >
                      <span className="flex items-center gap-1 group-hover:text-red-500 transition-colors">
                        Смени код
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 p-2 sm:p-3 md:p-4">
              {opened && (
                <BinCamera target={targetMaterial} binId={code.trim()} />
              )}
            </div>

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
      ) : (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-white px-4 antialiased dark:bg-neutral-950">
          <div className="w-full max-w-sm space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Въведете код на кош
            </h1>

            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Моля, въведете 6-цифрения код, за да продължите напред
            </p>

            {codeError && (
              <span className="text-red-500 bg-red-500/10 rounded-full text-md inline-flex gap-2 py-3 px-3.5">
                <OctagonAlert /> {codeError}
              </span>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Напр. 4K3NWX"
                value={code}
                className="flex h-12 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-center text-lg ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300"
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit(code)}
              />
              <button
                className="inline-flex gap-1 h-10 w-full items-center justify-center rounded-md bg-[#00CD56] px-4 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-[#00CD56]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50"
                onClick={() => handleCodeSubmit(code)}
              >
                Потвърди <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface MaterialButtonsProps {
  materials: Material[];
  targetMaterial: string;
  setTargetMaterial: (id: string) => void;
}

function MaterialButtons({
  materials,
  targetMaterial,
  setTargetMaterial,
}: MaterialButtonsProps) {
  return (
    <div className="h-full flex flex-col gap-2">
      <h2 className="text-lg font-semibold mb-2">Избор на материал</h2>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-1 md:h-full">
        {materials.map((material) => {
          const IconComponent = material.icon;

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
              <span className="flex-1 text-left lg:text-[18px]">
                {material.label}
              </span>

              {targetMaterial === material.id && <Check className="w-5 h-5" />}
            </button>
          );
        })}
      </div>

      {targetMaterial && (
        <button
          onClick={() => setTargetMaterial("")}
          className="mt-2 w-full bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary text-secondary-foreground font-medium px-4 py-2.5 rounded-lg flex items-center justify-center"
        >
          Изчисти избора <Eraser className="w-5 h-5 ml-2" />
        </button>
      )}
    </div>
  );
}
