import type React from "react"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react"
import { renderToString } from "react-dom/server"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { Recycle, MapPin, Filter, X, Home, Flag, PenLine, AlertCircle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
const RECYCLING_COLORS: Record<string, string> = {
  paper: "bg-gradient-to-r from-blue-400 to-blue-500",
  cardboard: "bg-gradient-to-r from-blue-400 to-blue-500",
  plastic: "bg-gradient-to-r from-yellow-400 to-yellow-500",
  metal: "bg-gradient-to-r from-gray-400 to-gray-500",
  aluminum: "bg-gradient-to-r from-gray-400 to-gray-500",
  glass: "bg-gradient-to-r from-green-400 to-green-500",
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
  container: "bg-gradient-to-r from-green-400 to-green-500",
  center: "bg-gradient-to-r from-indigo-400 to-indigo-500",
  dropoff: "bg-gradient-to-r from-cyan-400 to-cyan-500",
  waste_basket: "bg-gradient-to-r from-red-400 to-red-500",
  unknown: "bg-gradient-to-r from-gray-400 to-gray-500",
}

// Мапиране на специфични цветове от OSM тагове
const OSM_COLOR_MAPPING: Record<string, string> = {
  red: "bg-gradient-to-r from-red-400 to-red-500",
  green: "bg-gradient-to-r from-green-400 to-green-500",
  blue: "bg-gradient-to-r from-blue-400 to-blue-500",
  yellow: "bg-gradient-to-r from-yellow-400 to-yellow-500",
  gray: "bg-gradient-to-r from-gray-400 to-gray-500",
  grey: "bg-gradient-to-r from-gray-400 to-gray-500",
  purple: "bg-gradient-to-r from-purple-400 to-purple-500",
  teal: "bg-gradient-to-r from-teal-400 to-teal-500",
  pink: "bg-gradient-to-r from-pink-400 to-pink-500",
  orange: "bg-gradient-to-r from-orange-400 to-orange-500",
  brown: "bg-gradient-to-r from-amber-400 to-amber-500",
  black: "bg-gradient-to-r from-gray-400 to-gray-500",
  white: "bg-gradient-to-r from-gray-400 to-gray-500",
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
    keywords: ["plastic", "plastic_bottles", "plastic_packaging"] 
  },
  { 
    id: "glass", 
    label: "Стъкло", 
    color: "bg-gradient-to-r from-green-400 to-green-500", 
    keywords: ["glass", "green_glass", "brown_glass", "white_glass", "glass_bottles"] 
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
  "plastic packaging": "Пластмасови опаковки",
  cardboard: "картон",
  newspaper: "вестници",
  books: "книги",
  "glass bottles": "стъклени бутилки",
  "electrical appliances": "ел. уреди",
  cans: "кенове",
  "plastic bottles": "пластмасови бутилки",
  "scrap metal": "скрап",
  tyres: "гуми",
  tires: "гуми",
  "fluorescent tubes": "флуресцентни туби",
  textiles: "текстил"
};

type ReportType =
  | "incorrect_location"
  | "bin_missing"
  | "bin_damaged"
  | "wrong_materials"
  | "overflowing"
  | "duplicate"
  | "other"

interface CreateReportPayload {
  bin_id: string
  type: ReportType
  title: string
  description?: string
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
const MarkerWrapperWithRing = ({
  color,
  children,
}: {
  color: string
  children: React.ReactNode
}) => (
  <div className="relative">
    {/* Полупрозрачен външен контур за по-добра видимост */}
    <div 
      className="absolute inset-0 rounded-full"
      style={{
        border: '2px solid rgba(255, 255, 255, 0.3)',
        margin: '-2px',
      }}
    />
    {/* Вътрешно тяло на маркера */}
    <div className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center relative z-10 ${color}`}>
      {children}
    </div>
  </div>
)

// Компонент за иконата за рециклиране
const RecyclingIconContent = ({ color }: { color: string }) => (
  <MarkerWrapperWithRing color={color}>
    <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
  </MarkerWrapperWithRing>
)

// Компонент за иконата на обикновено кошче
const TrashIconContent = ({ color }: { color: string }) => (
  <MarkerWrapperWithRing color={color}>
    <Trash2 className="w-5 h-5 text-white" />
  </MarkerWrapperWithRing>
)

// Конфигурация на маркера за текущата позиция на потребителя
const UserMarkerIcon = L.divIcon({
  html: renderToString(
    <div className="relative">
      <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(255, 255, 255, 0.3)', margin: '-2px' }} />
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-lg flex items-center justify-center relative z-10">
        <MapPin className="w-5 h-5 text-white" />
      </div>
    </div>
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

// Логика за определяне на основния цвят на маркера спрямо OSM таговете
const getColorForBin = (bin: Bin): string => {
  // Приоритет 1: Директен таг за цвят
  if (bin.tags?.colour) {
    const osmColor = bin.tags.colour.toLowerCase()
    return OSM_COLOR_MAPPING[osmColor] || RECYCLING_COLORS.unknown
  }

  // Приоритет 2: Тип на рециклирането
  const types = bin.tags?.recycling_type?.split(",") ?? []
  for (const type of types) {
    const cleanType = type.trim().toLowerCase()
    if (RECYCLING_COLORS[cleanType]) {
      return RECYCLING_COLORS[cleanType]
    }
  }

  // Приоритет 3: Специфични recycling:* тагове
  const recyclingTags = Object.keys(bin.tags).filter((key) => key.startsWith("recycling:") && bin.tags[key] === "yes")

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
    }
  }

  // Приоритет 4: Тип на обекта (amenity)
  const amenity = bin.tags?.amenity?.toLowerCase()
  if (amenity === "waste_basket" || amenity === "waste_basket;recycling") {
    return RECYCLING_COLORS.waste_basket
  } else if (amenity === "recycling") {
    return RECYCLING_COLORS.center
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
  
  if (materialLower.includes("paper") || materialLower.includes("cardboard") || materialLower.includes("newspaper") || materialLower.includes("magazine") || materialLower.includes("book")) {
    return "Хартия"
  } else if (materialLower.includes("plastic")) {
    return "Пластмаса"
  } else if (materialLower.includes("glass") || materialLower.includes("bottle")) {
    return "Стъкло"
  } else if (materialLower.includes("metal") || materialLower.includes("aluminum") || materialLower.includes("aluminium") || materialLower.includes("can") || materialLower.includes("scrap")) {
    return "Метал"
  } else if (materialLower.includes("organic") || materialLower.includes("bio") || materialLower.includes("compost") || materialLower.includes("food")) {
    return "Органични"
  } else if (materialLower.includes("electron") || materialLower.includes("batter") || materialLower.includes("weee") || materialLower.includes("electrical") || materialLower.includes("fluorescent")) {
    return "Електроника"
  } else if (materialLower.includes("textile") || materialLower.includes("cloth") || materialLower.includes("clothes") || materialLower.includes("shoe") || materialLower.includes("tyre") || materialLower.includes("tire")) {
    return "Текстил"
  } else if (materialLower.includes("general") || materialLower.includes("residual") || materialLower.includes("waste") || materialLower.includes("trash")) {
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
  const binReportHistoryRef = useRef<Map<number, BinReportHistory>>(new Map());
  
  // Запазваме общата история на потребителя (общ брой отчети в последния час)
  const [userReportHistory, setUserReportHistory] = useState<number[]>([]);
  
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
  };

  // Функция за проверка дали отчетът е разрешен
  const canReportBin = useCallback((binId: number): { allowed: boolean; message?: string; timeLeft?: number } => {
    const now = Date.now();
    const history = binReportHistoryRef.current.get(binId);
    
    // Проверка за твърде много отчети за едно кошче
    if (history) {
      const timeSinceLastReport = now - history.lastReportTime;
      const reportsInLastDay = history.reportCount;
      
      // Проверка за минимално време между отчети
      if (timeSinceLastReport < LIMITS.BIN_MIN_TIME_BETWEEN_REPORTS * 60 * 1000) {
        const minutesLeft = Math.ceil((LIMITS.BIN_MIN_TIME_BETWEEN_REPORTS * 60 * 1000 - timeSinceLastReport) / (60 * 1000));
        return {
          allowed: false,
          message: `Трябва да изчакате ${minutesLeft} минути преди нов отчет за това кошче.`,
          timeLeft: minutesLeft
        };
      }
      
      // Проверка за максимален брой отчети дневно
      if (reportsInLastDay >= LIMITS.BIN_MAX_REPORTS_PER_DAY) {
        return {
          allowed: false,
          message: `Достигнахте максималния брой отчети (${LIMITS.BIN_MAX_REPORTS_PER_DAY}) за това кошче за деня.`,
        };
      }
    }
    
    // Проверка за общ брой отчети на потребителя
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentUserReports = userReportHistory.filter(time => time > oneHourAgo);
    
    if (recentUserReports.length >= LIMITS.USER_MAX_REPORTS_PER_HOUR) {
      return {
        allowed: false,
        message: `Достигнахте лимита от ${LIMITS.USER_MAX_REPORTS_PER_HOUR} отчета на час. Моля, изчакайте.`,
      };
    }
    
    // Проверка за минимално време между общи отчети
    if (userReportHistory.length > 0) {
      const lastReportTime = userReportHistory[userReportHistory.length - 1];
      const timeSinceLastUserReport = now - lastReportTime;
      
      if (timeSinceLastUserReport < LIMITS.USER_MIN_TIME_BETWEEN_REPORTS * 1000) {
        const secondsLeft = Math.ceil((LIMITS.USER_MIN_TIME_BETWEEN_REPORTS * 1000 - timeSinceLastUserReport) / 1000);
        return {
          allowed: false,
          message: `Моля, изчакайте ${secondsLeft} секунди преди следващия отчет.`,
          timeLeft: secondsLeft
        };
      }
    }
    
    return { allowed: true };
  }, [userReportHistory, LIMITS]);

  // Функция за записване на отчет
  const recordReport = useCallback((binId: number) => {
    const now = Date.now();
    const history = binReportHistoryRef.current.get(binId);
    
    // Актуализиране на историята за кошчето
    if (history) {
      // Нулиране на брояча ако е минал ден
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const reportCount = history.lastReportTime > oneDayAgo ? history.reportCount + 1 : 1;
      
      binReportHistoryRef.current.set(binId, {
        lastReportTime: now,
        reportCount
      });
    } else {
      binReportHistoryRef.current.set(binId, {
        lastReportTime: now,
        reportCount: 1
      });
    }
    
    // Актуализиране на общата история на потребителя
    setUserReportHistory(prev => {
      const oneHourAgo = now - (60 * 60 * 1000);
      const filtered = prev.filter(time => time > oneHourAgo);
      return [...filtered, now];
    });
    
    // Почистване на стара история от кошчетата (след 24 часа)
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    for (const [id, binHistory] of binReportHistoryRef.current) {
      if (binHistory.lastReportTime < oneDayAgo) {
        binReportHistoryRef.current.delete(id);
      }
    }
  }, []);

  // Функция за получаване на информация за лимитите
  const getLimitInfo = useCallback((binId: number) => {
    const history = binReportHistoryRef.current.get(binId);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentUserReports = userReportHistory.filter(time => time > oneHourAgo).length;
    
    return {
      binReportsToday: history?.reportCount || 0,
      binReportsLimit: LIMITS.BIN_MAX_REPORTS_PER_DAY,
      userReportsThisHour: recentUserReports,
      userReportsLimit: LIMITS.USER_MAX_REPORTS_PER_HOUR,
    };
  }, [userReportHistory, LIMITS]);

  return {
    canReportBin,
    recordReport,
    getLimitInfo,
    clearBinHistory: (binId: number) => binReportHistoryRef.current.delete(binId),
    clearUserHistory: () => setUserReportHistory([]),
  };
};

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
    
    const inViewport = filteredBins.filter(bin => {
      if (bin.lat == null || bin.lon == null) return false
      
      const latDiff = Math.abs(bin.lat - center.lat)
      const lngDiff = Math.abs(bin.lon - center.lng)
      
      // Бърза филтрация по координатна разлика
      if (latDiff > 0.1 || lngDiff > 0.1) return false
      
      return bounds.contains([bin.lat, bin.lon])
    }).slice(0, maxMarkers)
    
    // Проверка дали има промяна преди да се извика setVisibleBins
    const hasChanged = 
      visibleBins.length !== inViewport.length ||
      !visibleBins.every((bin, index) => bin.id === inViewport[index]?.id)
    
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
    
    map.on('moveend', handleMoveEnd)
    
    return () => {
      map.off('moveend', handleMoveEnd)
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
        const acceptedMaterials = Object.entries(bin.tags)
          .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
          .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "))

        const isReportDisabledForThisBin = isReportDisabled(bin.id)

        const popupContent = (
          <div className="relative p-4 min-w-[220px]">
            {/* Иконки за действие */}
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                className={`p-1.5 rounded-md transition ${
                  isReportDisabledForThisBin
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "hover:bg-red-50 text-red-500 hover:text-red-600"
                }`}
                title={isReportDisabledForThisBin ? "Отчетът е временно деактивиран за това кошче" : "Докладвай проблем"}
                onClick={() => !isReportDisabledForThisBin && onReport(bin)}
                disabled={isReportDisabledForThisBin}
              >
                <Flag className="w-4 h-4" />
              </button>

              <button
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition hover:text-gray-800"
                title="Предложи редактиране"
                onClick={() => onEdit(bin)}
              >
                <PenLine className="w-4 h-4" />
              </button>
            </div>

            {/* Заглавна част */}
            <div className="flex items-start gap-3 pr-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorForBin(bin)}`}
              >
                {bin.tags?.amenity === "waste_basket" ? (
                  <Trash2 className="w-5 h-5 text-white" />
                ) : (
                  <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-gray-800">
                  {bin.tags?.amenity === "waste_basket"
                    ? "Кошче за боклук"
                    : "Място за рециклиране"}
                </h3>
                {bin.tags?.name && (
                  <p className="text-sm text-gray-600">{bin.tags.name}</p>
                )}
              </div>
            </div>

            {/* Съдържание */}
            <div className="space-y-3">
              {bin.tags?.opening_hours && (
                <div className="bg-blue-50 p-2 rounded-md mt-3">
                  <div className="flex items-center gap-2 text-blue-700 text-sm">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <strong>Работно време:</strong> {bin.tags.opening_hours}
                    </span>
                  </div>
                </div>
              )}

              {acceptedMaterials.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Приема ({acceptedMaterials.length} материали):
                  </p>
                  
                  <div className="space-y-2">
                    {acceptedMaterials.map((material, idx) => {
                      const translated = materialTranslations[material.trim().toLowerCase()] || material
                      const category = getCategoryForMaterial(material)
                      const color = getMaterialColor(translated)
                      
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm text-gray-700 capitalize">
                              {translated}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
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
              }
            }}
          >
            <Popup>{popupContent}</Popup>
          </Marker>
        )
      })}
    </>
  )
})

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
}) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {modalMode === "report" 
                ? "Докладване на проблем" 
                : modalMode === "edit" 
                ? "Предложи редактиране" 
                : "Добавяне на ново кошче"}
            </h2>
            <button
              onClick={handleModalCancel}
              className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90"
              type="button"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {modalMode === "report" && reportLimitsInfo && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Лимити на отчети:</p>
                  <div className="mt-1 space-y-1">
                    <p>• Отчети за това кошче днес: {reportLimitsInfo.binReportsToday}/{reportLimitsInfo.binReportsLimit}</p>
                    <p>• Ваши отчети този час: {reportLimitsInfo.userReportsThisHour}/{reportLimitsInfo.userReportsLimit}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {modalMode === "report" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип проблем
                  </label>
                  <select
                    value={reportData.type}
                    onChange={(e) => updateReport("type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    disabled={isSubmitting}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заглавие
                  </label>
                  <input
                    value={reportData.title}
                    onChange={(e) => updateReport("title", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание (по избор)
                  </label>
                  <textarea
                    value={reportData.description}
                    onChange={(e) => updateReport("description", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            ) : modalMode === "edit" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Име на обекта (по избор)
                  </label>
                  <input
                    value={editData.name}
                    onChange={(e) => updateEdit("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    placeholder="Например: Рециклиране за квартал 'Младост'"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Работно време (по избор)
                  </label>
                  <input
                    value={editData.opening_hours}
                    onChange={(e) => updateEdit("opening_hours", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    placeholder="Например: 08:00-20:00"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Материали за рециклиране (разделени със запетая)
                  </label>
                  <textarea
                    value={editData.materials.join(", ")}
                    onChange={(e) => {
                      const materials = e.target.value.split(",").map(m => m.trim()).filter(m => m.length > 0)
                      updateEdit("materials", materials)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    placeholder="Например: пластмаса, стъкло, хартия"
                    rows={3}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Въведете материали, разделени със запетая
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Допълнителни бележки
                  </label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => updateEdit("notes", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    placeholder="Други предложения или корекции..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип съоръжение
                  </label>
                  <input
                    value={formData.amenity}
                    onChange={(e) => handleInputChange("amenity", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип рециклиране
                  </label>
                  <input
                    value={formData.recycling_type}
                    onChange={(e) => handleInputChange("recycling_type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Оператор
                  </label>
                  <input
                    value={formData.operator}
                    onChange={(e) => handleInputChange("operator", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recycling_clothes}
                      onChange={(e) => handleInputChange("recycling_clothes", e.target.checked)}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Приема дрехи (текстил)
                    </span>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recycling_shoes}
                      onChange={(e) => handleInputChange("recycling_shoes", e.target.checked)}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Приема обувки
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Брой контейнери
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.count}
                    onChange={(e) => handleInputChange("count", parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleModalCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Отказ
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {modalMode === "report" 
                  ? "Изпрати доклад" 
                  : modalMode === "edit" 
                  ? "Предложи промени" 
                  : "Добави"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
});

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
  if (!showFilterPanel) return null;

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
                isActive ? "ring-2 ring-blue-500 ring-offset-1 border-blue-500" : "hover:bg-gray-50 border-gray-200"
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

      <div className="mt-4 pt-4 border-t text-xs text-gray-600">
        <p>
          Показват се {filteredBins.length} от {bins.length} кошчета
        </p>
        {activeFilters.length > 0 && (
          <p className="mt-1">
            Филтрирани по: {activeFilters.map((id) => FILTER_OPTIONS.find((f) => f.id === id)?.label).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
});

// Основен компонент за картата
export default function MapComponent({ bins, onNewBinCreated, jawgApiKey }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Състояние за геолокация и настройки
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [prefersDark, setPrefersDark] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Начални координати за гр. Варна
  const DEFAULT_CENTER: [number, number] = [43.2141, 27.9147]
  const DEFAULT_ZOOM = 12
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  // Модал състояния
  const [modalMode, setModalMode] = useState<ModalMode>("add")
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    description: ""
  })

  // Състояние за редактиране
  const [editData, setEditData] = useState<EditFormData>({
    name: "",
    opening_hours: "",
    materials: [],
    notes: ""
  })

  // Инициализиране на анти-спам системата
  const spamProtection = useReportSpamProtection()

  // Мемоизирана икона за временния маркер при добавяне
  const tempMarkerIcon = useMemo(() => {
    const html = renderToString(
      <div className="relative">
        <div className="absolute inset-0 rounded-full animate-pulse" style={{ border: '2px solid rgba(255, 255, 255, 0.5)', margin: '-2px' }} />
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-lg flex items-center justify-center relative z-10">
          <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
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
  const [binMaterialCache] = useState<Map<number, Set<string>>>(() => {
    const cache = new Map<number, Set<string>>()

    bins.forEach((bin) => {
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
  })

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
        mapRef.current?.setView(loc, DEFAULT_ZOOM)
      },
      (err) => console.warn("Грешка при геолокация:", err),
    )
  }, [])

  /* Получаване на текущия потребител */
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUser(session.user)
        }
      } catch (error) {
        console.error("Грешка при получаване на потребител:", error)
      }
    }

    getCurrentUser()

    // Слушател за промени в автентикацията
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user || null)
      }
    )

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

  /* Филтриране на кошчетата - ФИКСИРАНА ВЕРСИЯ */
  const filteredBins = useMemo(() => {
    if (activeFilters.length === 0) return bins

    // Събира всички ключови думи от активните филтри
    const allKeywords: string[] = []
    activeFilters.forEach((filterId) => {
      const filter = FILTER_OPTIONS.find((f) => f.id === filterId)
      if (filter) {
        allKeywords.push(...filter.keywords)
      }
    })

    // Филтриране
    return bins.filter((bin) => {
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
  }, [bins, activeFilters, binMaterialCache])

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

  const handleZoomHome = () => {
    const map = mapRef.current;
    if (!map) return;

    const previousBounds = map.getBounds();
    let isLocationFound = false;

    const onLocationFound = (e: L.LocationEvent) => {
      isLocationFound = true;
      const targetZoom = 20;
      const targetLatLng = e.latlng;
      
      map.flyTo(targetLatLng, targetZoom, {
        animate: true,
        duration: 2.5,
        easeLinearity: 0.25,
        noMoveStart: true
      });
    };

    const onLocationError = (e: L.ErrorEvent) => {
      console.warn("Грешка при определяне на локация:", e.message);
    };

    map.once("locationfound", onLocationFound);
    map.once("locationerror", onLocationError);

    map.locate({
      setView: false,
      watch: false,
      enableHighAccuracy: true,
      timeout: 10000
    });

    const fallbackTimeoutId = setTimeout(() => {
      if (!isLocationFound && map) {
        map.off("locationfound", onLocationFound);
        map.off("locationerror", onLocationError);
        
        map.flyToBounds(previousBounds, {
          animate: true,
          duration: 1.5,
          padding: [50, 50]
        });
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimeoutId);
      if (map) {
        map.off("locationfound", onLocationFound);
        map.off("locationerror", onLocationError);
      }
    };
  };

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
    if (isSubmitting) return;
    
    setIsModalOpen(false)
    setTempMarkerPosition(null)
    setSelectedBin(null)
    setIsSubmitting(false)
    setReportData({
      type: "",
      title: "",
      description: ""
    })
    setEditData({
      name: "",
      opening_hours: "",
      materials: [],
      notes: ""
    })
    setFormData({
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    })
  }, [isSubmitting])

  const handleReport = useCallback((bin: Bin) => {
    if (!currentUser) {
      alert("Моля, влезте в профила си, за да докладвате проблем.");
      return;
    }
    
    const canReport = spamProtection.canReportBin(bin.id);
    
    if (!canReport.allowed) {
      if (typeof window !== 'undefined') {
        alert(canReport.message || "Отчетът не е позволен в момента.");
      }
      return;
    }
    
    setSelectedBin(bin)
    setModalMode("report")
    setIsModalOpen(true)
    setReportData({
      type: "",
      title: "",
      description: ""
    })
  }, [spamProtection, currentUser])

  const handleEdit = useCallback((bin: Bin) => {
    if (!currentUser) {
      alert("Моля, влезте в профила си, за да предложите редактиране.");
      return;
    }
    
    setSelectedBin(bin)
    setModalMode("edit")
    setIsModalOpen(true)
    
    // Попълване на текущите данни в формата за редактиране
    const currentMaterials = Object.entries(bin.tags)
      .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
      .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "))
    
    setEditData({
      name: bin.tags?.name || "",
      opening_hours: bin.tags?.opening_hours || "",
      materials: currentMaterials,
      notes: ""
    })
  }, [currentUser])

  const updateReport = useCallback((key: string, value: string) => {
    setReportData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateEdit = useCallback((key: string, value: string | string[]) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Функция за проверка дали отчетът е деактивиран за конкретно кошче
  const isReportDisabled = useCallback((binId: number): boolean => {
    const canReport = spamProtection.canReportBin(binId);
    return !canReport.allowed;
  }, [spamProtection])

  const generateRandomCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const submitReportToSupabase = async (reportData: {
    bin_id: string;
    type: ReportType;
    title: string;
    description?: string | null;
  }) => {
    if (!currentUser) {
      throw new Error("Потребителят не е влязал в системата.");
    }
    
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        bin_id: reportData.bin_id,
        type: reportData.type,
        title: reportData.title,
        description: reportData.description,
        user_id: currentUser.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select();
      
    if (error) {
      throw error;
    }
    
    return data;
  };

  const submitEditSuggestionToSupabase = async (editData: {
    bin_id: string;
    name?: string;
    opening_hours?: string;
    materials?: string[];
    notes?: string;
  }) => {
    if (!currentUser) {
      throw new Error("Потребителят не е влязал в системата.");
    }
    
    const { data, error } = await supabase
      .from('edit_suggestions')
      .insert([{
        bin_id: editData.bin_id,
        name: editData.name,
        opening_hours: editData.opening_hours,
        materials: editData.materials?.join(", "),
        notes: editData.notes,
        user_id: currentUser.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select();
      
    if (error) {
      throw error;
    }
    
    return data;
  };

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (isSubmitting) return;
      
      setIsSubmitting(true)

      if (modalMode === "report") {
        if (!selectedBin) {
          alert("Грешка: Не е избрано кошче.");
          setIsSubmitting(false);
          return;
        }
        
        const canReport = spamProtection.canReportBin(selectedBin.id);
        if (!canReport.allowed) {
          alert(canReport.message || "Отчетът вече не е позволен.");
          setIsSubmitting(false);
          return;
        }
        
        try {
          await submitReportToSupabase({
            bin_id: selectedBin.id.toString(),
            type: reportData.type as ReportType,
            title: reportData.title,
            description: reportData.description || null,
          });
          
          spamProtection.recordReport(selectedBin.id);
          
          console.log("Изпращане на отчет:", reportData, "за кошче:", selectedBin)
          
          if (typeof window !== 'undefined') {
            alert("Отчетът е изпратен успешно!");
          }
          
          setIsModalOpen(false)
          setReportData({
            type: "",
            title: "",
            description: ""
          })
          setSelectedBin(null)
        } catch (error) {
          console.error("Грешка при изпращане на отчет:", error)
          alert("Грешка при изпращане на отчета. Моля, опитайте отново.")
        } finally {
          setIsSubmitting(false)
        }
        return
      }

      if (modalMode === "edit") {
        if (!selectedBin) {
          alert("Грешка: Не е избрано кошче.");
          setIsSubmitting(false);
          return;
        }
        
        try {
          await submitEditSuggestionToSupabase({
            bin_id: selectedBin.id.toString(),
            name: editData.name || undefined,
            opening_hours: editData.opening_hours || undefined,
            materials: editData.materials,
            notes: editData.notes || undefined,
          });
          
          console.log("Изпращане на предложение за редактиране:", editData, "за кошче:", selectedBin)
          
          if (typeof window !== 'undefined') {
            alert("Предложението за редактиране е изпратено успешно!");
          }
          
          setIsModalOpen(false)
          setEditData({
            name: "",
            opening_hours: "",
            materials: [],
            notes: ""
          })
          setSelectedBin(null)
        } catch (error) {
          console.error("Грешка при изпращане на предложение за редактиране:", error)
          alert("Грешка при изпращане на предложението. Моля, опитайте отново.")
        } finally {
          setIsSubmitting(false)
        }
        return
      }

      // Логика за добавяне на ново кошче
      if (!tempMarkerPosition) {
        setIsSubmitting(false)
        return
      }

      try {
        const tags = {
          amenity: formData.amenity,
          recycling_type: formData.recycling_type,
          operator: formData.operator,
          "recycling:clothes": formData.recycling_clothes ? "yes" : "no",
          "recycling:shoes": formData.recycling_shoes ? "yes" : "no",
          count: String(formData.count),
        }

        const newBin: NewBin = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
          code: generateRandomCode(),
        }

        if (onNewBinCreated) {
          onNewBinCreated(newBin)
        }

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
        
        if (typeof window !== 'undefined') {
          alert("Кошчето е добавено успешно!");
        }
      } catch (error) {
        console.error("Грешка при добавяне на кошче:", error)
        alert("Грешка при добавяне на кошче. Моля, опитайте отново.")
      } finally {
        setIsSubmitting(false)
      }
    },
    [tempMarkerPosition, formData, onNewBinCreated, modalMode, reportData, selectedBin, editData, isSubmitting, spamProtection, currentUser],
  )

  const handleInputChange = useCallback((field: keyof BinFormData, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Получаване на информация за лимитите за текущо избраното кошче
  const reportLimitsInfo = useMemo(() => {
    if (!selectedBin) return undefined;
    return spamProtection.getLimitInfo(selectedBin.id);
  }, [selectedBin, spamProtection]);

  if (!isMounted) {
    return <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">Картата се зарежда...</div>
  }

  return (
    <div className="relative h-full w-full">
      {/* Копче за нулиране на изгледа */}
      <button
        onClick={handleZoomHome}
        className="absolute top-[80px] left-[10px] z-[1000] bg-white p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors"
        title="Нулирай изгледа"
        disabled={isSubmitting}
      >
        <Home className="w-5 h-5 text-gray-700" />
      </button>

      {/* Копче за показване/скриване на филтрите */}
      <button
        onClick={() => setShowFilterPanel(!showFilterPanel)}
        className="absolute top-[120px] left-[10px] z-[1000] bg-white p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors"
        title="Филтри"
        disabled={isSubmitting}
      >
        <Filter className="w-5 h-5 text-gray-700" />
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
        bins={bins}
      />

      {/* Модално окно */}
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
      />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        maxZoom={22}
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
              ? `https://tile.jawg.io/jawg-${prefersDark ? "dark" : "streets"}/{z}/{x}/{y}.png?access-token=${jawgApiKey}&lang=bg`
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
            <Popup>
              <div className="p-2 text-center">
                <p className="text-sm font-medium text-orange-600">Нова локация за кошче</p>
                <p className="text-xs text-gray-500">Попълнете формата, за да добавите</p>
              </div>
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