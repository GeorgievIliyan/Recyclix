"use client"

import type React from "react"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react"
import { renderToString } from "react-dom/server"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { Recycle, MapPin, Filter, X, Home, Flag, PenLine, AlertCircle, CircleCheckBig } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Типизация за данни от OpenStreetMap (OSM)
export interface Bin {
  id: number
  lat: number
  lon: number
  tags: Record<string, any>
  osm_type: "node" | "way" | "relation"
}

// Типизация за новосъздадени обекти в базата данни
export interface NewBin {
  id: string
  created_at: string
  updated_at: string
  osm_id: string | null
  lat: number
  lon: number
  tags: string
  capacity: number | null
  current_load: number
  total_weight: string
  organization_id: string | null
  last_emptied: string | null
  stats_today: string
  code: string
  image_url: string
}

// Интерфейс за данните от формата за добавяне
interface BinFormData {
  amenity: string
  recycling_type: string
  operator: string
  recycling_clothes: boolean
  recycling_shoes: boolean
  count: number
}

// Пропс за компонента на картата
interface MapProps {
  bins: Bin[]
  onNewBinCreated?: (bin: NewBin) => void
  jawgApiKey?: string
}

// Цветово кодиране според типа материал за рециклиране
export const RECYCLING_COLORS: Record<string, string> = {
  paper: "bg-gradient-to-r from-blue-400 to-blue-500",
  cardboard: "bg-gradient-to-r from-blue-400 to-blue-500",
  plastic: "bg-gradient-to-r from-yellow-400 to-yellow-500",
  metal: "bg-gradient-to-r from-gray-400 to-gray-500",
  aluminum: "bg-gradient-to-r from-gray-400 to-gray-500",
  glass: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  green_glass: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  brown_glass: "bg-gradient-to-r from-amber-400 to-amber-500",
  white_glass: "bg-gradient-to-r from-slate-400 to-slate-500",
  organic: "bg-gradient-to-r from-amber-400 to-amber-500",
  bio_waste: "bg-gradient-to-r from-amber-400 to-amber-500",
  compost: "bg-gradient-to-r from-amber-400 to-amber-500",
  electronics: "bg-gradient-to-r from-purple-400 to-purple-500",
  batteries: "bg-gradient-to-r from-orange-400 to-orange-500",
  textiles: "bg-gradient-to-r from-pink-400 to-pink-500",
  clothing: "bg-gradient-to-r from-pink-400 to-pink-500",
  general: "bg-gradient-to-r from-red-400 to-red-500",
  residual: "bg-gradient-to-r from-red-400 to-red-500",
  container: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  center: "bg-gradient-to-r from-indigo-400 to-indigo-500",
  dropoff: "bg-gradient-to-r from-cyan-400 to-cyan-500",
  waste_basket: "bg-gradient-to-r from-red-400 to-red-500",
  unknown: "bg-gradient-to-r from-gray-400 to-gray-500",
}

// Дефиниция на филтриращите категории в интерфейса
const FILTER_OPTIONS = [
  {
    id: "paper",
    label: "Хартия",
    color: "bg-gradient-to-r from-blue-400 to-blue-500",
    keywords: ["paper", "cardboard", "newspaper", "magazine", "book"],
  },
  {
    id: "plastic",
    label: "Пластмаса",
    color: "bg-gradient-to-r from-yellow-400 to-yellow-500",
    keywords: ["plastic", "plastic_bottles", "plastic_packaging"],
  },
  {
    id: "glass",
    label: "Стъкло",
    color: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    keywords: ["glass", "green_glass", "brown_glass", "white_glass", "glass_bottles"],
  },
  {
    id: "metal",
    label: "Метал",
    color: "bg-gradient-to-r from-gray-400 to-gray-500",
    keywords: ["metal", "aluminum", "aluminium", "cans", "scrap_metal"],
  },
  {
    id: "organic",
    label: "Органични",
    color: "bg-gradient-to-r from-amber-400 to-amber-500",
    keywords: ["organic", "bio", "compost", "bio_waste", "food_waste"],
  },
  {
    id: "electronics",
    label: "Електроника",
    color: "bg-gradient-to-r from-purple-400 to-purple-500",
    keywords: ["electronics", "batteries", "e_waste", "weee", "electrical_appliances"],
  },
  {
    id: "textiles",
    label: "Текстил",
    color: "bg-gradient-to-r from-pink-400 to-pink-500",
    keywords: ["textiles", "clothing", "clothes", "shoes", "tyres", "tires", "Clothes", "дрехи", "Дрехи"],
  },
  {
    id: "general",
    label: "Общи отпадъци",
    color: "bg-gradient-to-r from-red-400 to-red-500",
    keywords: ["general", "residual", "waste", "trash"],
  },
]

const materialTranslations: Record<string, string> = {
  plastic: "пластмаса",
  glass: "стъкло",
  paper: "хартия",
  metal: "метал",
  residual: "общи отпадъци",
  clothes: "дрехи",
  shoes: "обувки",
  magazines: "списания",
  "paper packaging": "опаковки",
  "plastic packaging": "пластмасови опаковки",
  cardboard: "картон",
  newspaper: "вестници",
  books: "книги",
  "glass bottles": "стъклени бутилки",
  "electrical appliances": "електроуреди",
  cans: "кенове",
  "plastic bottles": "пластмасови бутилки",
  "scrap metal": "скрап",
  tyres: "гуми",
  tires: "гуми",
  "fluorescent tubes": "флуресцентни туби",
  textiles: "текстил",
  "plastic bottle caps": "пластмасови капачки",
  "small electrical appliances": "малки електоур.",
  "metal packaging": "метални опаковки",
  "glass jars": "стъклени буркани",
  "beverage cartons": "опаковки от сок"
}

const dayMap: Record<string, string> = {
  Mo: "Пон",
  Tu: "Вт",
  We: "Ср",
  Th: "Чет",
  Fr: "Пет",
  Sa: "Съб",
  Su: "Нед",
}

const translateDays = (hours: string) => {
  return hours.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (match) => dayMap[match])
}

// Типове отчети от вашата таблица
type ReportType =
  | "incorrect_location"
  | "bin_missing"
  | "bin_damaged"
  | "wrong_materials"
  | "overflowing"
  | "duplicate"
  | "other"

// Интерфейс за изображение на отчет
interface ReportImage {
  id: string
  report_id: string
  photo_url: string
  created_at: string
}

interface CreateReportPayload {
  bin_id: string
  type: ReportType
  title: string
  description?: string
  images?: File[]
}

// Интерфейс за отчет от таблицата reports
export interface Report {
  id: string
  user_id: string
  bin_id: string
  created_at: string
  updated_at: string
  title: string
  type: ReportType
  description: string
  resolved: boolean
}

type ModalMode = "add" | "report" | "edit"

// Интерфейс за данните за редактиране
interface EditFormData {
  name: string
  opening_hours: string
  materials: string[]
  notes: string
}

// Контейнер за маркери с визуален ефект на пръстен
const MarkerWrapper = ({
  color,
  children,
}: {
  color: string
  children: React.ReactNode
}) => (
  <div className="relative">
    {/* Вътрешно тяло на маркера */}
    <div className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center relative z-10 ${color} shadow-sm`}>
      {children}
    </div>
  </div>
)

// Компонент за иконата за рециклиране
const RecyclingIconContent = ({ color }: { color: string }) => (
  <MarkerWrapper color={color}>
    <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
  </MarkerWrapper>
)

// Компонент за иконата на обикновено кошче
const TrashIconContent = ({ color }: { color: string }) => (
  <MarkerWrapper color={color}>
    <Trash2 className="w-5 h-5 text-white" />
  </MarkerWrapper>
)

// Конфигурация на маркера за текущата позиция на потребителя
const UserMarkerIcon = L.divIcon({
  html: renderToString(
    <div className="relative">
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: "2px solid rgba(255, 255, 255, 0.3)", margin: "-2px" }}
      />
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-lg flex items-center justify-center relative z-10">
        <MapPin className="w-5 h-5 text-white" />
      </div>
    </div>,
  ),
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Компонент за следене на промените в мащаба на картата
function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoom(e.target.getZoom())
    },
  })
  return null
}

// Компонент за обработка на кликове върху повърхността на картата
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (latlng: L.LatLng) => void
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng)
    },
  })
  return null
}

// Логика за определяне на основния цвят на маркера
const getColorForBin = (bin: Bin): string => {
  const types = bin.tags?.recycling_type?.split(",")
    .map((t: string) => t.trim().toLowerCase())
    .filter((t: string) => t.length > 0) ?? []
  
  for (const cleanType of types) {
    if (cleanType === "textiles" || cleanType === "clothes" || cleanType === "clothing" || 
        cleanType === "дрехи" || cleanType === "textile" || cleanType === "tyres" || 
        cleanType === "tires" || cleanType === "shoes") {
      return RECYCLING_COLORS.textiles
    }
  }
  
  const recyclingTags = Object.keys(bin.tags).filter((key) => 
    key.startsWith("recycling:") && bin.tags[key] === "yes"
  )
  
  for (const tag of recyclingTags) {
    const material = tag.replace("recycling:", "").trim().toLowerCase()
    if (material === "textiles" || material === "clothes" || material === "clothing" || 
        material === "textile" || material === "tyres" || material === "tires" || 
        material === "shoes" || material.includes("дрехи") || material.includes("cloth")) {
      return RECYCLING_COLORS.textiles
    }
  }

  if (types.length > 1) {
    return "bg-gradient-to-r from-emerald-400 to-emerald-500"
  }
  
  if (recyclingTags.length > 1) {
    return "bg-gradient-to-r from-emerald-400 to-emerald-500"
  }

  const hasRecyclingTypes = bin.tags?.recycling_type && bin.tags.recycling_type.trim().length > 0
  const hasRecyclingTags = recyclingTags.length > 0
  
  if (!hasRecyclingTypes && !hasRecyclingTags) {
    return "bg-gradient-to-r from-emerald-400 to-emerald-500"
  }

  for (const cleanType of types) {
    if (RECYCLING_COLORS[cleanType]) {
      return RECYCLING_COLORS[cleanType]
    }
    
    if (cleanType === "paper" || cleanType === "cardboard") {
      return RECYCLING_COLORS.paper
    } else if (cleanType === "plastic") {
      return RECYCLING_COLORS.plastic
    } else if (cleanType === "glass") {
      return RECYCLING_COLORS.glass
    } else if (cleanType === "metal" || cleanType === "aluminum" || cleanType === "aluminium") {
      return RECYCLING_COLORS.metal
    } else if (cleanType === "organic" || cleanType === "bio" || cleanType === "compost") {
      return RECYCLING_COLORS.organic
    } else if (cleanType === "electronics" || cleanType === "e_waste" || cleanType === "weee") {
      return RECYCLING_COLORS.electronics
    } else if (cleanType === "batteries") {
      return RECYCLING_COLORS.batteries
    } else if (cleanType === "general" || cleanType === "residual" || cleanType === "waste") {
      return RECYCLING_COLORS.general
    }
  }

  for (const tag of recyclingTags) {
    const material = tag.replace("recycling:", "").trim().toLowerCase()
    
    if (RECYCLING_COLORS[material]) {
      return RECYCLING_COLORS[material]
    }
    
    if (material.includes("paper") || material.includes("cardboard")) {
      return RECYCLING_COLORS.paper
    } else if (material.includes("plastic")) {
      return RECYCLING_COLORS.plastic
    } else if (material.includes("metal") || material.includes("aluminum") || material.includes("aluminium")) {
      return RECYCLING_COLORS.metal
    } else if (material.includes("glass")) {
      return RECYCLING_COLORS.glass
    } else if (material.includes("organic") || material.includes("bio") || material.includes("compost")) {
      return RECYCLING_COLORS.organic
    } else if (material.includes("electr") || material.includes("e_waste") || material.includes("weee")) {
      return RECYCLING_COLORS.electronics
    } else if (material.includes("batter")) {
      return RECYCLING_COLORS.batteries
    } else if (material.includes("general") || material.includes("residual") || material.includes("waste")) {
      return RECYCLING_COLORS.general
    }
  }

  const amenity = bin.tags?.amenity?.toLowerCase()
  if (amenity === "waste_basket" || amenity === "waste_basket;recycling") {
    return RECYCLING_COLORS.waste_basket
  } else if (amenity === "recycling") {
    return "bg-gradient-to-r from-emerald-400 to-emerald-500" 
  }

  return RECYCLING_COLORS.unknown
}

// Генериране на Leaflet икона за конкретно кошче
const createIconForBin = (bin: Bin): L.DivIcon => {
  const color = getColorForBin(bin)
  const isTrash = bin.tags?.amenity === "waste_basket"
  const html = renderToString(isTrash ? <TrashIconContent color={color} /> : <RecyclingIconContent color={color} />)

  return L.divIcon({
    html,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

// Връщане на HEX цвят за специфичен материал за визуализация в Popup
function getMaterialColor(material: string): string {
  if (material.includes("paper") || material.includes("cardboard")) return "#60a5fa"
  if (material.includes("plastic")) return "#fbbf24"
  if (material.includes("metal") || material.includes("aluminum")) return "#9ca3af"
  if (material.includes("glass")) return "#34d399"
  if (material.includes("organic") || material.includes("bio") || material.includes("compost")) return "#fbbf24"
  if (material.includes("electr") || material.includes("batter")) return "#c084fc"
  if (
    material.includes("textile") ||
    material.includes("cloth") ||
    material.includes("clothes") ||
    material.includes("shoes")
  )
    return "#f472b6"
  return "#9ca3af"
}

// Функция за определяне на категория за материал
function getCategoryForMaterial(material: string): string {
  const materialLower = material.toLowerCase()

  if (
    materialLower.includes("paper") ||
    materialLower.includes("cardboard") ||
    materialLower.includes("newspaper") ||
    materialLower.includes("magazine") ||
    materialLower.includes("book")
  ) {
    return "Хартия"
  } else if (materialLower.includes("plastic")) {
    return "Пластмаса"
  } else if (materialLower.includes("glass") || materialLower.includes("bottle")) {
    return "Стъкло"
  } else if (
    materialLower.includes("metal") ||
    materialLower.includes("aluminum") ||
    materialLower.includes("aluminium") ||
    materialLower.includes("can") ||
    materialLower.includes("scrap")
  ) {
    return "Метал"
  } else if (
    materialLower.includes("organic") ||
    materialLower.includes("bio") ||
    materialLower.includes("compost") ||
    materialLower.includes("food")
  ) {
    return "Органични"
  } else if (
    materialLower.includes("electron") ||
    materialLower.includes("batter") ||
    materialLower.includes("weee") ||
    materialLower.includes("electrical") ||
    materialLower.includes("fluorescent")
  ) {
    return "Електроника"
  } else if (
    materialLower.includes("textile") ||
    materialLower.includes("cloth") ||
    materialLower.includes("clothes") ||
    materialLower.includes("shoe") ||
    materialLower.includes("tyre") ||
    materialLower.includes("tire")
  ) {
    return "Текстил"
  } else if (
    materialLower.includes("general") ||
    materialLower.includes("residual") ||
    materialLower.includes("waste") ||
    materialLower.includes("trash")
  ) {
    return "Общи отпадъци"
  }

  return "Други"
}


// Интерфейс за съхранение на отчети за кошче
interface BinReportHistory {
  lastReportTime: number
  reportCount: number
}

// Хук за анти-спам защита на отчетите
const useReportSpamProtection = () => {
  // Запазваме история за всяко кошче (bin id -> report history)
  const binReportHistoryRef = useRef<Map<number, BinReportHistory>>(new Map())

  // Запазваме общата история на потребителя (общ брой отчети в последния час)
  const [userReportHistory, setUserReportHistory] = useState<number[]>([])

  // Конфигурация на ограниченията
  const LIMITS = {
    // Максимален брой отчети за едно кошче в рамките на 24 часа
    BIN_MAX_REPORTS_PER_DAY: 2,
    // Минимално време между отчети за едно кошче (в минути)
    BIN_MIN_TIME_BETWEEN_REPORTS: 60,
    // Максимален общ брой отчети на потребител в рамките на 1 час
    USER_MAX_REPORTS_PER_HOUR: 2,
    // Минимално време между общи отчети (в секунди)
    USER_MIN_TIME_BETWEEN_REPORTS: 60,
  }

  // Функция за проверка дали отчетът е разрешен
  const canReportBin = useCallback(
    (binId: number): { allowed: boolean; message?: string; timeLeft?: number } => {
      const now = Date.now()
      const history = binReportHistoryRef.current.get(binId)

      // Проверка за твърде много отчети за едно кошче
      if (history) {
        const timeSinceLastReport = now - history.lastReportTime
        const reportsInLastDay = history.reportCount

        // Проверка за минимално време между отчети
        if (timeSinceLastReport < LIMITS.BIN_MIN_TIME_BETWEEN_REPORTS * 60 * 1000) {
          const minutesLeft = Math.ceil(
            (LIMITS.BIN_MIN_TIME_BETWEEN_REPORTS * 60 * 1000 - timeSinceLastReport) / (60 * 1000),
          )
          return {
            allowed: false,
            message: `Трябва да изчакате ${minutesLeft} минути преди нов отчет за това кошче.`,
            timeLeft: minutesLeft,
          }
        }

        // Проверка за максимален брой отчети дневно
        if (reportsInLastDay >= LIMITS.BIN_MAX_REPORTS_PER_DAY) {
          return {
            allowed: false,
            message: `Достигнахте максималния брой отчети (${LIMITS.BIN_MAX_REPORTS_PER_DAY}) за това кошче за деня.`,
          }
        }
      }

      // Проверка за общ брой отчети на потребителя
      const oneHourAgo = now - 60 * 60 * 1000
      const recentUserReports = userReportHistory.filter((time) => time > oneHourAgo)

      if (recentUserReports.length >= LIMITS.USER_MAX_REPORTS_PER_HOUR) {
        return {
          allowed: false,
          message: `Достигнахте лимита от ${LIMITS.USER_MAX_REPORTS_PER_HOUR} отчета на час. Моля, изчакайте.`,
        }
      }

      // Проверка за минимално време между общи отчети
      if (userReportHistory.length > 0) {
        const lastReportTime = userReportHistory[userReportHistory.length - 1]
        const timeSinceLastUserReport = now - lastReportTime

        if (timeSinceLastUserReport < LIMITS.USER_MIN_TIME_BETWEEN_REPORTS * 1000) {
          const secondsLeft = Math.ceil((LIMITS.USER_MIN_TIME_BETWEEN_REPORTS * 1000 - timeSinceLastUserReport) / 1000)
          return {
            allowed: false,
            message: `Моля, изчакайте ${secondsLeft} секунди преди следващия отчет.`,
            timeLeft: secondsLeft,
          }
        }
      }

      return { allowed: true }
    },
    [userReportHistory, LIMITS],
  )

  // Функция за записване на отчет
  const recordReport = useCallback((binId: number) => {
    const now = Date.now()
    const history = binReportHistoryRef.current.get(binId)

    // Актуализиране на историята за кошчето
    if (history) {
      // Нулиране на брояча ако е минал ден
      const oneDayAgo = now - 24 * 60 * 60 * 1000
      const reportCount = history.lastReportTime > oneDayAgo ? history.reportCount + 1 : 1

      binReportHistoryRef.current.set(binId, {
        lastReportTime: now,
        reportCount,
      })
    } else {
      binReportHistoryRef.current.set(binId, {
        lastReportTime: now,
        reportCount: 1,
      })
    }

    // Актуализиране на общата история на потребителя
    setUserReportHistory((prev) => {
      const oneHourAgo = now - 60 * 60 * 1000
      const filtered = prev.filter((time) => time > oneHourAgo)
      return [...filtered, now]
    })

    // Почистване на стара история от кошчетата (след 24 часа)
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    for (const [id, binHistory] of binReportHistoryRef.current) {
      if (binHistory.lastReportTime < oneDayAgo) {
        binReportHistoryRef.current.delete(id)
      }
    }
  }, [])

  // Функция за получаване на информация за лимитите
  const getLimitInfo = useCallback(
    (binId: number) => {
      const history = binReportHistoryRef.current.get(binId)
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentUserReports = userReportHistory.filter((time) => time > oneHourAgo).length

      return {
        binReportsToday: history?.reportCount || 0,
        binReportsLimit: LIMITS.BIN_MAX_REPORTS_PER_DAY,
        userReportsThisHour: recentUserReports,
        userReportsLimit: LIMITS.USER_MAX_REPORTS_PER_HOUR,
      }
    },
    [userReportHistory, LIMITS],
  )

  return {
    canReportBin,
    recordReport,
    getLimitInfo,
    clearBinHistory: (binId: number) => binReportHistoryRef.current.delete(binId),
    clearUserHistory: () => setUserReportHistory([]),
  }
}

// Оптимизиран компонент за рендиране само на маркерите във видимата част на екрана
const ViewportAwareMarkers = memo(function ViewportAwareMarkers({
  filteredBins,
  zoom,
  onReport,
  onEdit,
  isReportDisabled,
}: {
  filteredBins: Bin[]
  zoom: number
  onReport: (bin: Bin) => void
  onEdit: (bin: Bin) => void
  isReportDisabled: (binId: number) => boolean
}) {
  const map = useMap()
  const [visibleBins, setVisibleBins] = useState<Bin[]>([])
  const prevFilteredBinsRef = useRef<Bin[]>([])
  const prevZoomRef = useRef<number>(zoom)

  // Функция за обновяване на видимите маркери - мемоизирана с useCallback
  const updateVisibleBins = useCallback(() => {
    if (!map || zoom < 10) {
      if (visibleBins.length > 0) {
        setVisibleBins([])
      }
      return
    }

    const bounds = map.getBounds()
    const center = map.getCenter()
    const zoomLevel = map.getZoom()

    // Динамичен лимит на маркерите за предотвратяване на лагване
    const maxMarkers = zoomLevel < 13 ? 50 : zoomLevel < 15 ? 100 : 200

    const inViewport = filteredBins
      .filter((bin) => {
        // ФИКС: Проверка за валидни координати
        if (bin.lat == null || bin.lon == null || isNaN(bin.lat) || isNaN(bin.lon)) {
          return false
        }

        const latDiff = Math.abs(bin.lat - center.lat)
        const lngDiff = Math.abs(bin.lon - center.lng)

        // Бърза филтрация по координатна разлика
        if (latDiff > 0.1 || lngDiff > 0.1) return false

        return bounds.contains([bin.lat, bin.lon])
      })
      .slice(0, maxMarkers)

    // Проверка дали има промяна преди да се извика setVisibleBins
    const hasChanged =
      visibleBins.length !== inViewport.length || !visibleBins.every((bin, index) => bin.id === inViewport[index]?.id)

    if (hasChanged) {
      setVisibleBins(inViewport)
    }
  }, [map, zoom, filteredBins, visibleBins]) // Добавяме visibleBins в зависимостите

  // Обновяване на видимите маркери при промяна на мащаба или списъка
  useEffect(() => {
    if (zoom < 10) {
      if (visibleBins.length > 0) {
        setVisibleBins([])
      }
      return
    }

    // Проверяваме дали има реална промяна преди да извикаме updateVisibleBins
    const filteredBinsChanged =
      prevFilteredBinsRef.current.length !== filteredBins.length ||
      !prevFilteredBinsRef.current.every((bin, index) => bin.id === filteredBins[index]?.id)

    const zoomChanged = prevZoomRef.current !== zoom

    if (filteredBinsChanged || zoomChanged) {
      // Изчакване на 100ms за стабилизиране на картата
      const timeoutId = setTimeout(updateVisibleBins, 100)

      // Актуализираме референциите
      prevFilteredBinsRef.current = filteredBins
      prevZoomRef.current = zoom

      return () => clearTimeout(timeoutId)
    }
  }, [updateVisibleBins, zoom, filteredBins, visibleBins.length])

  // Слушател за събитието на преместване на картата
  useEffect(() => {
    if (!map || zoom < 10) return

    const handleMoveEnd = () => {
      updateVisibleBins()
    }

    map.on("moveend", handleMoveEnd)

    return () => {
      map.off("moveend", handleMoveEnd)
    }
  }, [map, zoom, updateVisibleBins])

  // Първоначално зареждане при монтиране
  useEffect(() => {
    if (map && zoom >= 10) {
      const timeoutId = setTimeout(updateVisibleBins, 300)
      return () => clearTimeout(timeoutId)
    }
  }, []) // Празен масив - изпълнява се само веднъж при монтиране

  if (zoom < 10) return null

  return (
    <>
      {visibleBins.map((bin) => {
        // Пропускане на кошовете с невалидни координати
        if (bin.lat == null || bin.lon == null || isNaN(bin.lat) || isNaN(bin.lon)) {
          return null
        }

        const acceptedMaterials = Object.entries(bin.tags)
          .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
          .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "))

        const isReportDisabledForThisBin = isReportDisabled(bin.id)

        const popupContent = (
          <div className="relative p-4 min-w-[220px] dark:bg-neutral-800 bg-white dark:text-white text-gray-900">
            {/* Иконки за действие */}
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                className={`p-1.5 rounded-md transition ${
                  isReportDisabledForThisBin
                    ? "bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-neutral-400 cursor-not-allowed"
                    : "hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600 dark:hover:text-red-500"
                }`}
                title={
                  isReportDisabledForThisBin ? "Отчетът е временно деактивиран за това кошче" : "Докладвай проблем"
                }
                onClick={() => !isReportDisabledForThisBin && onReport(bin)}
                disabled={isReportDisabledForThisBin}
              >
                <Flag className="w-4 h-4" />
              </button>

              <button
                className="p-1.5 rounded-md hover:bg-green-100 hover:text-green-500 text-gray-600 dark:text-neutral-300 transition hover:text-gray-800 dark:hover:bg-green-500/10 dark:hover:text-green-500 transition duration-150"
                title="Предложи редактиране"
                onClick={() => onEdit(bin)}
              >
                <PenLine className="w-4 h-4" />
              </button>
            </div>

            {/* Заглавна част */}
            <div className="flex items-start gap-3 pr-10">
              <div className={`w-10 h-10 rounded-full flex items-center aspect-1/1 justify-center ${getColorForBin(bin)}`}>
                {bin.tags?.amenity === "waste_basket" ? (
                  <Trash2 className="w-5 h-5 text-white" />
                ) : (
                  <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-gray-800 dark:text-white">
                  {bin.tags?.amenity === "waste_basket" ? "Кошче за боклук" : "Място за рециклиране"}
                </h3>
                {bin.tags?.name && <p className="text-sm text-gray-600 dark:text-neutral-300">{bin.tags.name}</p>}
              </div>
            </div>

            {/* Съдържание */}
            <div className="space-y-3">
              {bin.tags?.opening_hours && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md mt-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <strong>Работно време:</strong> {translateDays(bin.tags.opening_hours)}
                    </span>
                  </div>
                </div>
              )}

              {acceptedMaterials.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-white mb-2 flex gap-2 items-center">
                    <CircleCheckBig className="text-green-500 w-4 h-4" /> 
                    <p>Приема:</p>
                  </div>

                  <div className="space-y-2">
                    {acceptedMaterials.map((material, idx) => {
                      const translated = materialTranslations[material.trim().toLowerCase()] || material
                      const category = getCategoryForMaterial(material)
                      const color = getMaterialColor(material)

                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm text-gray-700 dark:text-neutral-200">{translated}</span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300">
                            {category}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

        return (
          <Marker
            key={bin.id}
            position={[bin.lat, bin.lon]}
            icon={createIconForBin(bin)}
            eventHandlers={{
              click: (e) => {
                e.target.openPopup()
              },
            }}
          >
            <Popup>{popupContent}</Popup>
          </Marker>
        )
      })}
    </>
  )
})

// Страничен панел за филтрация на обектите на картата
const FilterPanel = memo(function FilterPanel({
  showFilterPanel,
  setShowFilterPanel,
  activeFilters,
  clearAllFilters,
  removeFilter,
  toggleFilter,
  filteredBins,
  bins,
}: {
  showFilterPanel: boolean
  setShowFilterPanel: (show: boolean) => void
  activeFilters: string[]
  clearAllFilters: () => void
  removeFilter: (filterId: string) => void
  toggleFilter: (filterId: string) => void
  filteredBins: Bin[]
  bins: Bin[]
}) {
  if (!showFilterPanel) return null

  return (
    <div className="absolute top-[160px] left-[10px] z-[1000] bg-white p-4 rounded-md shadow-lg border max-w-xs w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-gray-800">Филтри за материали</h3>
        <button onClick={() => setShowFilterPanel(false)} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Активни филтри:</span>
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-800">
              Изчисти всички
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filterId) => {
              const filter = FILTER_OPTIONS.find((f) => f.id === filterId)
              if (!filter) return null
              return (
                <div
                  key={filterId}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
                  style={{ background: "linear-gradient(to right, #60a5fa, #3b82f6)" }}
                >
                  <span>{filter.label}</span>
                  <button
                    onClick={() => removeFilter(filterId)}
                    className="ml-1 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilters.includes(filter.id)
          return (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              className={`flex items-center justify-between w-full p-3 rounded-lg border transition-all ${
                isActive ? "ring-2 ring-green-500 ring-offset-1 border-blue-500" : "hover:bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${filter.color}`}></div>
                <span className="font-medium text-gray-800">{filter.label}</span>
              </div>
              {isActive && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})

// Функция за проверка на администраторски статус
const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", userId).single()
    return data?.is_admin === true
  } catch (error) {
    return false
  }
}

// Функция за одобряване на кош
const approveBin = async (userId: string, binId: string, binData: any): Promise<boolean> => {
  try {
    console.log("Одобряване на кош:", binId, binData)

    // Проверка за администраторски права
    const isAdmin = await checkAdminStatus(userId)
    if (!isAdmin) return false

    // Обновяване статуса на pending_bins
    const { error: updateError } = await supabase
      .from("pending_bins")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", binId)

    if (updateError) {
      console.error("грешка при обновяване:", updateError)
      return false
    }

    // Добавяне в recycling_bins
    const nowISO = new Date().toISOString()
    const recyclingBinData = {
      code: binData.code || binId,
      lat: binData.lat,
      lon: binData.lon,
      tags: binData.tags ?? {},
      stats_today: {},
      created_at: binData.created_at || nowISO,
      updated_at: nowISO,
      last_emptied: null,
      osm_id: "",
    }

    const { error: insertError } = await supabase.from("recycling_bins").insert([recyclingBinData])

    if (insertError) {
      console.error("грешка при добавяне:", insertError)
      return false
    }

    console.log("успешно одобрен!")
    return true
  } catch (error) {
    console.error("грешка:", error)
    return false
  }
}

// Функция за отхвърляне на кош
const rejectBin = async (userId: string, binId: string): Promise<boolean> => {
  try {
    // Проверка за администраторски права
    const isAdmin = await checkAdminStatus(userId)
    if (!isAdmin) return false

    const { error } = await supabase.from("pending_bins").delete().eq("id", binId)

    if (error) {
      console.error("Грешка при изтриване на кош:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Грешка:", error)
    return false
  }
}

// Функция за получаване на отчети за кош
const getBinReports = async (binId: string): Promise<Report[]> => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("bin_id", binId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Грешка при зареждане на отчети:", error)
    return []
  }
}

// Функция за маркиране на отчет като разрешен
const resolveReport = async (reportId: string, userId: string): Promise<boolean> => {
  try {
    // Проверка за администраторски права
    const isAdmin = await checkAdminStatus(userId)
    if (!isAdmin) return false

    const { error } = await supabase
      .from("reports")
      .update({
        resolved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)

    if (error) {
      console.error("Грешка при разрешаване на отчет:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Грешка:", error)
    return false
  }
}

// Функция за изтриване на отчет
const deleteReport = async (reportId: string, userId: string): Promise<boolean> => {
  try {
    // Проверка за администраторски права
    const isAdmin = await checkAdminStatus(userId)
    if (!isAdmin) return false

    const { error } = await supabase.from("reports").delete().eq("id", reportId)

    if (error) {
      console.error("Грешка при изтриване на отчет:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Грешка:", error)
    return false
  }
}

// Модален прозорец за добавяне на нов контейнер от потребител
const AddBinModal = memo(function AddBinModal({
  isModalOpen,
  modalMode,
  tempMarkerPosition,
  formData,
  reportData,
  editData,
  handleModalCancel,
  handleFormSubmit,
  handleInputChange,
  updateReport,
  updateEdit,
  isSubmitting,
  reportLimitsInfo,
  reportImages,
  uploadingImages,
  handleImageSelect,
  handleRemoveImage,
  binImages = [],
  uploadingBinImages = false,
  handleBinImageSelect,
  handleRemoveBinImage,
}: {
  isModalOpen: boolean
  modalMode: ModalMode
  tempMarkerPosition: [number, number] | null
  formData: BinFormData
  reportData: {
    type: string
    title: string
    description: string
  }
  editData: EditFormData
  handleModalCancel: () => void
  handleFormSubmit: (e: React.FormEvent) => void
  handleInputChange: (field: keyof BinFormData, value: string | boolean | number) => void
  updateReport: (key: string, value: string) => void
  updateEdit: (key: string, value: string | string[]) => void
  isSubmitting?: boolean
  reportLimitsInfo?: {
    binReportsToday: number
    binReportsLimit: number
    userReportsThisHour: number
    userReportsLimit: number
  }
  reportImages: File[]
  uploadingImages: boolean
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveImage: (index: number) => void
  binImages?: File[]
  uploadingBinImages?: boolean
  handleBinImageSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveBinImage?: (index: number) => void
}) {
    const [materialsInput, setMaterialsInput] = useState(editData.materials.join(", "));
    if (!isModalOpen) return null

    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 dark:bg-neutral-800 dark:text-white">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <Trash2 className="text-green-500"/>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {modalMode === "report"
                    ? "Докладване на проблем"
                    : modalMode === "edit"
                      ? "Предложи редактиране"
                      : "Добавяне на ново кошче"}
                </h2>
              </div>
              <button
                onClick={handleModalCancel}
                className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-all duration-200 hover:rotate-90"
                type="button"
                disabled={isSubmitting || uploadingImages || uploadingBinImages}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {modalMode === "report" && reportLimitsInfo && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium">Лимити на отчети:</p>
                    <div className="mt-1 space-y-1">
                      <p>
                        • Отчети за това кошче днес: {reportLimitsInfo.binReportsToday}/{reportLimitsInfo.binReportsLimit}
                      </p>
                      <p>
                        • Ваши отчети този час: {reportLimitsInfo.userReportsThisHour}/{reportLimitsInfo.userReportsLimit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {modalMode === "report" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип проблем</label>
                    <select
                      value={reportData.type}
                      onChange={(e) => updateReport("type", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                      disabled={isSubmitting || uploadingImages}
                    >
                      <option value="">Избери</option>
                      <option value="incorrect_location">Грешна локация</option>
                      <option value="bin_missing">Липсва</option>
                      <option value="bin_damaged">Повредено</option>
                      <option value="wrong_materials">Грешни материали</option>
                      <option value="overflowing">Препълнено</option>
                      <option value="duplicate">Дубликат</option>
                      <option value="other">Друго</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Заглавие</label>
                    <input
                      value={reportData.title}
                      onChange={(e) => updateReport("title", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500\ focus:border-green-500"
                      required
                      placeholder="Напр. Кошчето е препълнено"
                      disabled={isSubmitting || uploadingImages}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание (по избор)</label>
                    <textarea
                      value={reportData.description}
                      onChange={(e) => updateReport("description", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows={3}
                      placeholder="Опишете по-подробно проблема..."
                      disabled={isSubmitting || uploadingImages}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Снимка</label>
                    <div className="space-y-3">
                      {reportImages.length < 5 && (
                        <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Добави снимка</span>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            disabled={isSubmitting || uploadingImages}
                          />
                        </label>
                      )}

                      {reportImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {reportImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(image) || "/placeholder.svg"}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-neutral-700"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveBinImage && handleRemoveBinImage(index)}
                                className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center w-5 h-5"
                                disabled={isSubmitting || uploadingBinImages}
                              >
                                <X className="w-4 h-4 text-red-500" strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {uploadingImages && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Качване на снимки...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : modalMode === "edit" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Име на обекта (по избор)</label>
                    <input
                      value={editData.name}
                      onChange={(e) => updateEdit("name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Например: Рециклиране за квартал 'Младост'"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Работно време (по избор)</label>
                    <input
                      value={editData.opening_hours}
                      onChange={(e) => updateEdit("opening_hours", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Например: 08:00-20:00"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Материали за рециклиране (разделени със запетая)
                    </label>
                    <textarea
                      value={materialsInput}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setMaterialsInput(rawValue);
                        const materialsArray = rawValue
                          .split(",")
                          .map((m) => m.trim())
                          .filter((m) => m !== "");

                        updateEdit("materials", materialsArray);
                      }}
                      className="w-full h-32 resize-none px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Например: пластмаса, стъкло, хартия"
                      rows={3}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Въведете материали, разделени със запетая</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Допълнителни бележки</label>
                    <textarea
                      value={editData.notes}
                      onChange={(e) => updateEdit("notes", e.target.value)}
                      className="w-full h-32 resize-none px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Други предложения или корекции..."
                      rows={3}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип съоръжение</label>
                    <select
                      value={formData.amenity}
                      onChange={(e) => handleInputChange("amenity", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Изберете тип съоръжение</option>
                      <option value="waste_basket">Кошче за боклук</option>
                      <option value="container">Контейнер</option>
                      <option value="centre">Център за рециклиране</option>
                      <option value="dropoff">Пункт за сваляне</option>
                      <option value="other">Друго</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Тип рециклиране</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "пластмаса", label: "Пластмаса" },
                        { value: "стъкло", label: "Стъкло" },
                        { value: "хартия", label: "Хартия" },
                        { value: "картон", label: "Картон" },
                        { value: "метал", label: "Метал" },
                        { value: "алуминий", label: "Алуминий" },
                        { value: "електроника", label: "Електроника" },
                        { value: "батерии", label: "Батерии" },
                        { value: "текстил", label: "Текстил" },
                        { value: "дрехи", label: "Дрехи" },
                        { value: "органични отпадъци", label: "Органични отпадъци" },
                        { value: "биоотпадъци", label: "Биоотпадъци" },
                        { value: "общи отпадъци", label: "Общи отпадъци" },
                      ].map((option) => {
                        const currentTypes = formData.recycling_type ? 
                          formData.recycling_type.split(",").map(t => t.trim()) : [];
                        const isChecked = currentTypes.includes(option.value);
                        
                        return (
                          <div key={option.value} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`recycling-${option.value}`}
                              checked={isChecked}
                              onChange={(e) => {
                                const currentTypes = formData.recycling_type ? 
                                  formData.recycling_type.split(",").map(t => t.trim()) : [];
                                let newTypes;
                                if (e.target.checked) {
                                  newTypes = [...currentTypes, option.value];
                                } else {
                                  newTypes = currentTypes.filter(t => t !== option.value);
                                }
                                handleInputChange("recycling_type", newTypes.join(", "));
                              }}
                              className="h-4 w-4 text-green-600 border-gray-300 dark:border-neutral-600 rounded focus:ring-green-500 dark:focus:ring-green-400 dark:bg-neutral-800"
                              disabled={isSubmitting}
                            />
                            <label 
                              htmlFor={`recycling-${option.value}`} 
                              className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              {option.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Оператор</label>
                    <input
                      value={formData.operator}
                      onChange={(e) => handleInputChange("operator", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Име на организацията"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Брой контейнери</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.count}
                      onChange={(e) => handleInputChange("count", Number.parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Снимка на коша 
                    </label>

                    <div className="space-y-3">
                      {binImages.length < 5 && (
                        <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Добави снимка</span>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleBinImageSelect}
                            disabled={isSubmitting || uploadingBinImages}
                          />
                        </label>
                      )}

                      {binImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {binImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-neutral-700"
                                onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveBinImage && handleRemoveBinImage(index)}
                                className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center w-5 h-5"
                                disabled={isSubmitting || uploadingBinImages}
                              >
                                <X className="w-4 h-4 text-red-500" strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {uploadingBinImages && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Качване на снимки...</span>
                        </div>
                      )}
                    </div>
                  </div>

                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors transition duration-150 hover:border-red-400"
                  disabled={isSubmitting || uploadingImages || uploadingBinImages}
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  disabled={isSubmitting || uploadingImages || uploadingBinImages}
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {modalMode === "report" ? "Изпрати доклад" : modalMode === "edit" ? "Предложи промени" : "Добави"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  })

// Основен компонент за картата
export default function MapComponent({ bins, onNewBinCreated, jawgApiKey }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // states за изображения
  const [binImages, setBinImages] = useState<File[]>([])
  const [uploadingBinImages, setUploadingBinImages] = useState(false)

  const handleBinImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    setBinImages((prev) => [...prev, ...filesArray].slice(0, 5))
  }

  const handleRemoveBinImage = (index: number) => {
    setBinImages((prev) => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    const applyPopupStyles = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (isDark) {
        const popups = document.querySelectorAll('.leaflet-popup');
        popups.forEach(popup => {
          popup.classList.add('dark-mode-popup');
        });
      }
    };
    
    applyPopupStyles();
    const interval = setInterval(applyPopupStyles, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Филтриране на кошовете с валидни координати
  const validBins = useMemo(
    () => bins.filter((bin) => bin.lat != null && bin.lon != null && !isNaN(bin.lat) && !isNaN(bin.lon)),
    [bins],
  )

  // Състояние за геолокация и настройки
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [prefersDark, setPrefersDark] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Начални координати
  const DEFAULT_CENTER: [number, number] = [42.6, 25.11]
  let DEFAULT_ZOOM = 8
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  // Модал състояния
  const [modalMode, setModalMode] = useState<ModalMode>("add")
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Състояние за отчети на избраното кошче
  const [binReports, setBinReports] = useState<Report[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)

  const [reportImages, setReportImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  // Състояние за текущия потребител
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Състояния за управление на формата за нов маркер
  const [tempMarkerPosition, setTempMarkerPosition] = useState<[number, number] | null>(null)
  const [formData, setFormData] = useState<BinFormData>({
    amenity: "recycling",
    recycling_type: "",
    operator: "",
    recycling_clothes: false,
    recycling_shoes: false,
    count: 1,
  })

  // Състояние за докладване
  const [reportData, setReportData] = useState({
    type: "",
    title: "",
    description: "",
  })

  // Състояние за редактиране
  const [editData, setEditData] = useState<EditFormData>({
    name: "",
    opening_hours: "",
    materials: [],
    notes: "",
  })

  // Инициализиране на анти-спам системата
  const spamProtection = useReportSpamProtection()

  useEffect(() => {
    return () => {
      binImages.forEach((image) => {
        if (image instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(image))
        }
      })
      reportImages.forEach((image) => {
        if (image instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(image))
        }
      })
    }
  }, [binImages, reportImages])

  // Мемоизирана икона за временния маркер при добавяне
  const tempMarkerIcon = useMemo(() => {
    const html = renderToString(
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ border: "2px solid rgba(255, 255, 255, 0.5)", margin: "-2px" }}
        />
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-lg flex items-center justify-center relative z-10">
          <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>,
    )
    return L.divIcon({
      html,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    })
  }, [])

  // Кеширане на материалите за всеки контейнер за по-бързо филтриране
  const binMaterialCache = useMemo(() => {
    const cache = new Map<number, Set<string>>()

    validBins.forEach((bin) => {
      // Използване на validBins вместо bins
      const materials = new Set<string>()

      // Добавяне на материали от recycling_type
      if (bin.tags?.recycling_type) {
        bin.tags.recycling_type.split(",").forEach((type: string) => {
          materials.add(type.trim().toLowerCase())
        })
      }

      // Добавяне на материали от recycling:* тагове
      Object.keys(bin.tags).forEach((key) => {
        if (key.startsWith("recycling:") && bin.tags[key] === "yes") {
          const material = key.replace("recycling:", "").trim().toLowerCase()
          materials.add(material)
        }
      })

      cache.set(bin.id, materials)
    })

    return cache
  }, [validBins])

  /* Тъмен режим – безопасно за SSR */
  useEffect(() => {
    setPrefersDark(window.matchMedia("(prefers-color-scheme: dark)").matches)
  }, [])

  /* Получаване на текущата локация */
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserLocation(loc)
        DEFAULT_ZOOM = 12
        mapRef.current?.setView(loc, DEFAULT_ZOOM)
      },
      (err) => console.warn("Грешка при геолокация:", err),
    )
  }, [])

  /* Получаване на текущия потребител */
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUser(session.user)
        }
      } catch (error) {
        console.error("Грешка при получаване на потребител:", error)
      }
    }

    getCurrentUser()

    // Слушател за промени в автентикацията
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (isMounted && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100)
    }
  }, [isMounted])

  /* Проверка дали кошче приема материали - оптимизирана версия */
  const binAcceptsMaterial = useCallback(
    (bin: Bin, materialKeywords: string[]): boolean => {
      const materials = binMaterialCache.get(bin.id)
      if (!materials) return false

      // Проверка за всяка ключова дума
      for (const keyword of materialKeywords) {
        // Директна проверка в Set
        if (materials.has(keyword)) return true

        // Проверка за частично съвпадение
        for (const material of materials) {
          if (material.includes(keyword) || keyword.includes(material)) {
            return true
          }
        }
      }

      return false
    },
    [binMaterialCache],
  )

  /* Филтриране на кошчетата */
  const filteredBins = useMemo(() => {
    if (activeFilters.length === 0) return validBins

    // Събира всички ключови думи от активните филтри
    const allKeywords: string[] = []
    activeFilters.forEach((filterId) => {
      const filter = FILTER_OPTIONS.find((f) => f.id === filterId)
      if (filter) {
        allKeywords.push(...filter.keywords)
      }
    })

    // Филтриране
    return validBins.filter((bin) => {
      const materials = binMaterialCache.get(bin.id)
      if (!materials) return false

      // Проверка дали поне един от ключовите думи съвпада
      for (const keyword of allKeywords) {
        // Проверка за директно съвпадение
        if (materials.has(keyword)) return true

        // Проверка за частично съвпадение
        for (const material of materials) {
          if (material.includes(keyword) || keyword.includes(material)) {
            return true
          }
        }
      }

      return false
    })
  }, [validBins, activeFilters, binMaterialCache])

  /* Превключване на филтър */
  const toggleFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => {
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId)
      } else {
        return [...prev, filterId]
      }
    })
  }, [])

  /* Изчистване на всички филтри */
  const clearAllFilters = useCallback(() => {
    setActiveFilters([])
  }, [])

  /* Премахване на филтър */
  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => prev.filter((id) => id !== filterId))
  }, [])

  // Функция за зареждане на отчети за кош
  const loadBinReports = useCallback(async (binId: string) => {
    if (!binId) return

    setIsLoadingReports(true)
    try {
      const reports = await getBinReports(binId)
      setBinReports(reports)
    } catch (error) {
      console.error("Грешка при зареждане на отчети:", error)
    } finally {
      setIsLoadingReports(false)
    }
  }, [])

  const handleZoomHome = () => {
    const map = mapRef.current
    if (!map) return

    const previousBounds = map.getBounds()
    let isLocationFound = false

    const onLocationFound = (e: L.LocationEvent) => {
      isLocationFound = true
      const targetZoom = 20
      const targetLatLng = e.latlng

      map.flyTo(targetLatLng, targetZoom, {
        animate: true,
        duration: 2.5,
        easeLinearity: 0.25,
        noMoveStart: true,
      })
    }

    const onLocationError = (e: L.ErrorEvent) => {
      console.warn("Грешка при определяне на локация:", e.message)
    }

    map.once("locationfound", onLocationFound)
    map.once("locationerror", onLocationError)

    map.locate({
      setView: false,
      watch: false,
      enableHighAccuracy: true,
      timeout: 10000,
    })

    const fallbackTimeoutId = setTimeout(() => {
      if (!isLocationFound && map) {
        map.off("locationfound", onLocationFound)
        map.off("locationerror", onLocationError)

        map.flyToBounds(previousBounds, {
          animate: true,
          duration: 1.5,
          padding: [50, 50],
        })
      }
    }, 5000)

    return () => {
      clearTimeout(fallbackTimeoutId)
      if (map) {
        map.off("locationfound", onLocationFound)
        map.off("locationerror", onLocationError)
      }
    }
  }

  const handleMapClick = useCallback((latlng: L.LatLng) => {
    setModalMode("add")
    setTempMarkerPosition([latlng.lat, latlng.lng])
    setIsModalOpen(true)
    setFormData({
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    })
  }, [])

  const handleModalCancel = useCallback(() => {
    if (isSubmitting || uploadingImages) return

    setIsModalOpen(false)
    setTempMarkerPosition(null)
    setSelectedBin(null)
    setIsSubmitting(false)
    setReportData({
      type: "",
      title: "",
      description: "",
    })
    setReportImages([])
    setEditData({
      name: "",
      opening_hours: "",
      materials: [],
      notes: "",
    })
    setFormData({
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    })
    setBinReports([])
  }, [isSubmitting, uploadingImages])

  const handleReport = useCallback(
    (bin: Bin) => {
      if (!currentUser) {
        alert("Моля, влезте в профила си, за да докладвате проблем.")
        return
      }

      const canReport = spamProtection.canReportBin(bin.id)

      if (!canReport.allowed) {
        if (typeof window !== "undefined") {
          alert(canReport.message || "Отчетът не е позволен в момента.")
        }
        return
      }

      setSelectedBin(bin)
      setModalMode("report")
      setIsModalOpen(true)
      setReportData({
        type: "",
        title: "",
        description: "",
      })
      loadBinReports(bin.id.toString())
    },
    [spamProtection, currentUser, loadBinReports],
  )

  const handleEdit = useCallback(
    (bin: Bin) => {
      if (!currentUser) {
        alert("Моля, влезте в профила си, за да предложите редактиране.")
        return
      }

      setSelectedBin(bin)
      setModalMode("edit")
      setIsModalOpen(true)

      const currentMaterials = Object.entries(bin.tags)
        .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
        .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "))

      setEditData({
        name: bin.tags?.name || "",
        opening_hours: bin.tags?.opening_hours || "",
        materials: currentMaterials,
        notes: "",
      })
    },
    [currentUser],
  )

  const updateReport = useCallback((key: string, value: string) => {
    setReportData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateEdit = useCallback((key: string, value: string | string[]) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const isReportDisabled = useCallback(
    (binId: number): boolean => {
      const canReport = spamProtection.canReportBin(binId)
      return !canReport.allowed
    },
    [spamProtection],
  )

  const generateRandomCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const submitReportToSupabase = async (reportData: {
    bin_id: string
    type: ReportType
    title: string
    description?: string | null
  }) => {
    if (!currentUser) {
      throw new Error("Потребителят не е влязъл в системата.")
    }

    const { data: reportDataResult, error } = await supabase
      .from("reports")
      .insert([
        {
          bin_id: reportData.bin_id,
          type: reportData.type,
          title: reportData.title,
          description: reportData.description,
          user_id: currentUser.id,
          resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      throw error
    }

    if (reportImages.length > 0 && reportDataResult && reportDataResult[0]) {
      setUploadingImages(true)
      const reportId = reportDataResult[0].id

      for (const image of reportImages) {
        try {
          const fileExt = image.name.split(".").pop()
          const fileName = `${reportId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = fileName

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("report-photos")
            .upload(filePath, image, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error("Error uploading image to storage:", uploadError)
            continue
          }

          const { data: { publicUrl } } = supabase.storage.from("report-photos").getPublicUrl(filePath)

          const { error: dbInsertError } = await supabase
            .from("report_photos")
            .insert([
              {
                report_id: reportId,
                photo_url: publicUrl,
                user_id: currentUser.id,
                created_at: new Date().toISOString(),
              },
            ])

          if (dbInsertError) {
            console.error("Error saving image to report_photos table:", dbInsertError)
          } else {
            console.log("✅ Image saved to report_photos table")
          }
          
        } catch (err) {
          console.error("Error processing image:", err)
        }
      }
      setUploadingImages(false)
    }

    return reportDataResult
  }

  const submitEditSuggestionToSupabase = async (editData: {
    bin_id: string
    name?: string
    opening_hours?: string
    materials?: string[]
    notes?: string
  }) => {
    if (!currentUser) {
      throw new Error("Потребителят не е влязъл в системата.")
    }

    const { data, error } = await supabase
      .from("edit_suggestions")
      .insert([
        {
          bin_id: editData.bin_id,
          name: editData.name,
          opening_hours: editData.opening_hours,
          materials: editData.materials?.join(", "),
          notes: editData.notes,
          user_id: currentUser.id,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      throw error
    }

    return data
  }

  const submitBinToPending = async (binData: {
    lat: number
    lon: number
    tags: any
    code: string
    images?: File[]
  }) => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Потребителят не е влязъл в системата.")

      // Insert bin into pending_bins
      const { data, error } = await supabase
        .from("pending_bins")
        .insert({
          user_id: user.id,
          lat: binData.lat,
          lon: binData.lon,
          tags: binData.tags,
          code: binData.code,
          status: "pending",
        })
        .select()

      if (error) throw error
      const newBin = data[0]

      // Upload images if any
      if (binData.images && binData.images.length > 0) {
        for (const image of binData.images) {
          const fileExt = image.name.split(".").pop()
          const fileName = `${newBin.id}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}.${fileExt}`
          const filePath = fileName

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("bins")
            .upload(filePath, image, { cacheControl: '3600', upsert: false })

          if (uploadError) {
            console.error("Error uploading bin image:", uploadError)
            continue
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage.from("bins").getPublicUrl(filePath)

          // Update bin with image URL (only first image for now)
          const { error: dbUpdateError } = await supabase
            .from("pending_bins")
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", newBin.id)

          if (dbUpdateError) console.error("Error saving bin image URL:", dbUpdateError)
          else console.log("✅ Bin image saved:", publicUrl)
        }
      }

      return data
    } catch (error) {
      console.error("Грешка при записване на кошче в pending_bins:", error)
      throw error
    }
  }

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isSubmitting || uploadingImages) return
      setIsSubmitting(true)

      try {
        // ===== REPORT MODE =====
        if (modalMode === "report") {
          if (!selectedBin) throw new Error("Грешка: Не е избрано кошче.")
          const canReport = spamProtection.canReportBin(selectedBin.id)
          if (!canReport.allowed) throw new Error(canReport.message || "Отчетът вече не е позволен.")

          await submitReportToSupabase({
            bin_id: selectedBin.id.toString(),
            type: reportData.type as ReportType,
            title: reportData.title,
            description: reportData.description || null,
          })
          spamProtection.recordReport(selectedBin.id)

          if (typeof window !== "undefined") {
            alert("Отчетът е изпратен успешно! Може да бъде прегледан от администратор.")
          }

          setIsModalOpen(false)
          setReportData({ type: "", title: "", description: "" })
          setReportImages([])
          setSelectedBin(null)
          if (selectedBin) loadBinReports(selectedBin.id.toString())
          return
        }

        // ===== EDIT MODE =====
        if (modalMode === "edit") {
          if (!selectedBin) throw new Error("Грешка: Не е избрано кошче.")
          await submitEditSuggestionToSupabase({
            bin_id: selectedBin.id.toString(),
            name: editData.name || undefined,
            opening_hours: editData.opening_hours || undefined,
            materials: editData.materials,
            notes: editData.notes || undefined,
          })

          if (typeof window !== "undefined") {
            alert("Предложението за редактиране е изпратено успешно! Може да бъде прегледано от администратор.")
          }

          setIsModalOpen(false)
          setEditData({ name: "", opening_hours: "", materials: [], notes: "" })
          setSelectedBin(null)
          return
        }

        // ===== ADD NEW BIN MODE =====
        if (!tempMarkerPosition) throw new Error("Локацията на кошчето не е зададена.")

        const tags = {
          amenity: formData.amenity,
          recycling_type: formData.recycling_type,
          operator: formData.operator,
          "recycling:clothes": formData.recycling_clothes ? "yes" : "no",
          "recycling:shoes": formData.recycling_shoes ? "yes" : "no",
          count: String(formData.count),
        }

        const code = generateRandomCode()

        // Submit bin with images
        const result = await submitBinToPending({
          lat: tempMarkerPosition[0],
          lon: tempMarkerPosition[1],
          tags,
          code,
          images: binImages, // <- NEW: pass images
        })

        console.log("Кошчето е записано успешно в pending_bins:", result)

        // Update local state / call callback
        if (onNewBinCreated) {
          const newBin: NewBin = {
            id: result[0].id,
            created_at: result[0].created_at,
            updated_at: result[0].updated_at,
            osm_id: null,
            lat: tempMarkerPosition[0],
            lon: tempMarkerPosition[1],
            tags: JSON.stringify(tags),
            capacity: null,
            current_load: 0,
            total_weight: "0.00",
            organization_id: null,
            last_emptied: null,
            stats_today: "{}",
            code: code,
            image_url: result[0].image_url || null,
          }
          onNewBinCreated(newBin)
        }

        // Reset form
        setIsModalOpen(false)
        setTempMarkerPosition(null)
        setFormData({
          amenity: "recycling",
          recycling_type: "",
          operator: "",
          recycling_clothes: false,
          recycling_shoes: false,
          count: 1,
        })
        setBinImages([])

        if (typeof window !== "undefined") {
          alert("Кошчето е добавено успешно! Ще бъде прегледано от администратор преди да се появи на картата.")
        }
      } catch (error: any) {
        console.error("Грешка при изпращане на формата:", error)
        alert(`Грешка: ${error.message || "Моля, опитайте отново."}`)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      tempMarkerPosition,
      formData,
      onNewBinCreated,
      modalMode,
      reportData,
      selectedBin,
      editData,
      isSubmitting,
      uploadingImages,
      binImages,
      spamProtection,
      currentUser,
      loadBinReports,
    ]
  )

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        const newImages = Array.from(files).slice(0, 5 - reportImages.length) // Max 5 images
        setReportImages((prev) => [...prev, ...newImages])
      }
    },
    [reportImages.length],
  )

  const handleRemoveImage = useCallback((index: number) => {
    setReportImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleInputChange = useCallback((field: keyof BinFormData, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Получаване на информация за лимитите за текущо избраното кошче
  const reportLimitsInfo = useMemo(() => {
    if (!selectedBin) return undefined
    return spamProtection.getLimitInfo(selectedBin.id)
  }, [selectedBin, spamProtection])

  // ДОБАВЕНА: Функция за получаване на броя неразрешени отчети
  const getUnresolvedReportsCount = useMemo(() => {
    return binReports.filter((report) => !report.resolved).length
  }, [binReports])

  // ДОБАВЕНА: Функция за получаване на общия брой отчети
  const getTotalReportsCount = useMemo(() => {
    return binReports.length
  }, [binReports])

  if (!isMounted) {
    return <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">Картата се зарежда...</div>
  }

  return (
    <div className="relative h-full w-full">
      {/* Копче за нулиране на изгледа */}
      <button
        onClick={handleZoomHome}
        className="absolute top-[80px] left-[10px] z-[1000] bg-white dark:bg-neutral-800 p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors"
        title="Нулирай изгледа"
        disabled={isSubmitting || uploadingImages}
      >
        <Home className="w-5 h-5 text-neutral-800 dark:text-white" />
      </button>

      {/* Копче за показване/скриване на филтрите */}
      <button
        onClick={() => setShowFilterPanel(!showFilterPanel)}
        className="absolute top-[120px] left-[10px] z-[1000] bg-white dark:bg-neutral-800 p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors"
        title="Филтри"
        disabled={isSubmitting || uploadingImages}
      >
        <Filter className="w-5 h-5 text-neutral-800 dark:text-white" />
        {activeFilters.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilters.length}
          </span>
        )}
      </button>

      {/* Панел с филтри */}
      <FilterPanel
        showFilterPanel={showFilterPanel}
        setShowFilterPanel={setShowFilterPanel}
        activeFilters={activeFilters}
        clearAllFilters={clearAllFilters}
        removeFilter={removeFilter}
        toggleFilter={toggleFilter}
        filteredBins={filteredBins}
        bins={validBins}
      />

      {/* модален прозорец */}
      <AddBinModal
        isModalOpen={isModalOpen}
        modalMode={modalMode}
        tempMarkerPosition={tempMarkerPosition}
        formData={formData}
        reportData={reportData}
        editData={editData}
        handleModalCancel={handleModalCancel}
        handleFormSubmit={handleFormSubmit}
        handleInputChange={handleInputChange}
        updateReport={updateReport}
        updateEdit={updateEdit}
        isSubmitting={isSubmitting}
        reportLimitsInfo={reportLimitsInfo}
        reportImages={reportImages}
        uploadingImages={uploadingImages}
        handleImageSelect={handleImageSelect}
        handleRemoveImage={handleRemoveImage}
        binImages={binImages}
        uploadingBinImages={uploadingBinImages}
        handleBinImageSelect={handleBinImageSelect}
        handleRemoveBinImage={handleRemoveBinImage}
      />

      {/* брой отчети индикатор (показва се само при докладване на проблем) */}
      {modalMode === "report" && selectedBin && (
        <div className="absolute top-[160px] right-[10px] z-[1000] bg-white p-3 rounded-md shadow-md border max-w-xs w-64">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800">Отчети за това кошче</h4>
            {isLoadingReports ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-xs text-gray-500">{getTotalReportsCount} общо</span>
            )}
          </div>

          {!isLoadingReports && binReports.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Неразрешени:</span>
                <span className="font-medium text-red-600">{getUnresolvedReportsCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Разрешени:</span>
                <span className="font-medium text-green-600">{getTotalReportsCount - getUnresolvedReportsCount}</span>
              </div>

              {/* Последните 3 отчета */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-gray-500 mb-2">Последни отчети:</p>
                <div className="space-y-1.5">
                  {binReports.slice(0, 3).map((report) => (
                    <div
                      key={report.id}
                      className={`p-2 rounded text-xs ${
                        report.resolved ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium truncate">{report.title}</span>
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] ${
                            report.resolved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {report.resolved ? "Разрешен" : "Активен"}
                        </span>
                      </div>
                      <p className="text-gray-600 truncate mt-1">{report.description || "Без описание"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isLoadingReports ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">Все още няма отчети за това кошче</p>
          )}
        </div>
      )}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        maxZoom={22}
        zoomControl={false}
        className="h-full w-full"
        ref={(map) => {
          if (map) mapRef.current = map
        }}
      >
        <ZoomWatcher onZoom={setZoom} />
        <MapClickHandler onMapClick={handleMapClick} />

        <TileLayer
          key={prefersDark ? "dark" : "light"}
          url={
            jawgApiKey
              ? `https://tile.jawg.io/jawg-${prefersDark ? "dark" : "streets"}/{z}/{x}/{y}.png?access-token=${jawgApiKey}`
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution="&copy; OpenStreetMap contributors"
          maxNativeZoom={20}
          maxZoom={22}
          minZoom={4}
          minNativeZoom={4}
        />

        {/* Локация на потребителя */}
        {userLocation && <Marker position={userLocation} icon={UserMarkerIcon} />}

        {tempMarkerPosition && (
          <Marker position={tempMarkerPosition} icon={tempMarkerIcon}>
            <Popup className="dark:bg-neutral-800">
            </Popup>
          </Marker>
        )}

        {/* Viewport-aware маркери - показват се само тези в зоната на виждане */}
        <ViewportAwareMarkers
          filteredBins={filteredBins}
          zoom={zoom}
          onReport={handleReport}
          onEdit={handleEdit}
          isReportDisabled={isReportDisabled}
        />
      </MapContainer>
    </div>
  )
}
