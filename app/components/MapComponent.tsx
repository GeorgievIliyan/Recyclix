import type React from "react"
import "leaflet/dist/leaflet.css"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react"
import { renderToString } from "react-dom/server"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { Recycle, Home, Filter, X } from "lucide-react"

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
    keywords: ["paper", "cardboard"],
  },
  { id: "plastic", label: "Пластмаса", color: "bg-gradient-to-r from-yellow-400 to-yellow-500", keywords: ["plastic"] },
  { id: "glass", label: "Стъкло", color: "bg-gradient-to-r from-green-400 to-green-500", keywords: ["glass"] },
  {
    id: "metal",
    label: "Метал",
    color: "bg-gradient-to-r from-gray-400 to-gray-500",
    keywords: ["metal", "aluminum", "aluminium"],
  },
  {
    id: "organic",
    label: "Органични",
    color: "bg-gradient-to-r from-amber-400 to-amber-500",
    keywords: ["organic", "bio", "compost"],
  },
  {
    id: "electronics",
    label: "Електроника",
    color: "bg-gradient-to-r from-purple-400 to-purple-500",
    keywords: ["electronics", "batteries", "e_waste", "weee"],
  },
  {
    id: "textiles",
    label: "Текстил",
    color: "bg-gradient-to-r from-pink-400 to-pink-500",
    keywords: ["textiles", "clothing"],
  },
  {
    id: "general",
    label: "Общи отпадъци",
    color: "bg-gradient-to-r from-red-400 to-red-500",
    keywords: ["general", "residual"],
  },
]

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
        <Home className="w-5 h-5 text-white" />
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

// Оптимизиран компонент за рендиране само на маркерите във видимата част на екрана
const ViewportAwareMarkers = memo(function ViewportAwareMarkers({
  filteredBins,
  zoom,
}: {
  filteredBins: Bin[]
  zoom: number
}) {
  const map = useMap()
  const [visibleBins, setVisibleBins] = useState<Bin[]>([])
  
  // Обновяване на видимите маркери при промяна на мащаба или списъка
  useEffect(() => {
    if (zoom < 10) {
      setVisibleBins([])
      return
    }

    const updateVisibleBins = () => {
      if (!map) return
      
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
      
      setVisibleBins(inViewport)
    }

    // Изчакване на 100ms за стабилизиране на картата
    const timeoutId = setTimeout(updateVisibleBins, 100)
    
    return () => clearTimeout(timeoutId)
  }, [map, filteredBins, zoom])

  // Слушател за събитието на преместване на картата
  useEffect(() => {
    if (!map || zoom < 10) return
    
    const handleMoveEnd = () => {
      const bounds = map.getBounds()
      const center = map.getCenter()
      const zoomLevel = map.getZoom()
      
      const maxMarkers = zoomLevel < 13 ? 50 : zoomLevel < 15 ? 100 : 200
      
      const inViewport = filteredBins.filter(bin => {
        if (bin.lat == null || bin.lon == null) return false
        
        const latDiff = Math.abs(bin.lat - center.lat)
        const lngDiff = Math.abs(bin.lon - center.lng)
        
        if (latDiff > 0.1 || lngDiff > 0.1) return false
        
        return bounds.contains([bin.lat, bin.lon])
      }).slice(0, maxMarkers)
      
      setVisibleBins(inViewport)
    }

    map.on('moveend', handleMoveEnd)
    
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map, filteredBins, zoom])

  if (zoom < 10) return null

  return (
    <>
      {visibleBins.map((bin) => {
        const acceptedMaterials = Object.entries(bin.tags)
          .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
          .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "))

        const popupContent = (
          <div className="p-4 min-w-[200px]">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorForBin(bin)}`}>
                {bin.tags?.amenity === "waste_basket" ? (
                  <Trash2 className="w-5 h-5 text-white" />
                ) : (
                  <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {bin.tags?.amenity === "waste_basket" ? "Кошче за боклук" : "Място за рециклиране"}
                </h3>
                {bin.tags?.name && <p className="text-sm text-gray-600 mt-1">{bin.tags.name}</p>}
              </div>
            </div>

            <div className="space-y-3">
              {bin.tags?.opening_hours && (
                <div className="bg-blue-50 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="text-blue-500">
                      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Работно време:</span> {bin.tags.opening_hours}
                    </p>
                  </div>
                </div>
              )}

              {acceptedMaterials.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 text-green-500">
                      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Приема материали:</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {acceptedMaterials.slice(0, 6).map((material, idx) => {
                      const cleanMaterial = material.trim().toLowerCase()
                      const color = getMaterialColor(cleanMaterial)
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-gray-700 truncate">
                            {material.charAt(0).toUpperCase() + material.slice(1)}
                          </span>
                        </div>
                      )
                    })}
                    {acceptedMaterials.length > 6 && (
                      <div className="col-span-2 text-center">
                        <span className="text-xs text-gray-500">
                          +{acceptedMaterials.length - 6} още
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {bin.tags?.ref && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">ID:</span> {bin.tags.ref}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                Кликнете извън popup-а, за да го затворите
              </p>
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
  tempMarkerPosition,
  formData,
  handleModalCancel,
  handleFormSubmit,
  handleInputChange,
}: {
  isModalOpen: boolean
  tempMarkerPosition: [number, number] | null
  formData: BinFormData
  handleModalCancel: () => void
  handleFormSubmit: (e: React.FormEvent) => void
  handleInputChange: (field: keyof BinFormData, value: string | boolean | number) => void
}) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Добавяне на ново кошче</h2>
            <button
              onClick={handleModalCancel}
              className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90"
              type="button"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="animate-in slide-in-from-left duration-300" style={{ animationDelay: "50ms" }}>
              <label htmlFor="amenity" className="block text-sm font-medium text-gray-700 mb-1">
                Тип съоръжение
              </label>
              <input
                type="text"
                id="amenity"
                value={formData.amenity}
                onChange={(e) => handleInputChange("amenity", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="recycling"
              />
            </div>

            <div className="animate-in slide-in-from-left duration-300" style={{ animationDelay: "100ms" }}>
              <label htmlFor="recycling_type" className="block text-sm font-medium text-gray-700 mb-1">
                Тип рециклиране
              </label>
              <input
                type="text"
                id="recycling_type"
                value={formData.recycling_type}
                onChange={(e) => handleInputChange("recycling_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="container"
              />
            </div>

            <div className="animate-in slide-in-from-left duration-300" style={{ animationDelay: "150ms" }}>
              <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-1">
                Оператор
              </label>
              <input
                type="text"
                id="operator"
                value={formData.operator}
                onChange={(e) => handleInputChange("operator", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900"
                placeholder="Организация"
              />
            </div>

            <div
              className="space-y-3 animate-in slide-in-from-left duration-300"
              style={{ animationDelay: "200ms" }}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recycling_clothes"
                  checked={formData.recycling_clothes}
                  onChange={(e) => handleInputChange("recycling_clothes", e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded transition-all duration-200"
                />
                <label htmlFor="recycling_clothes" className="ml-2 block text-sm text-gray-700">
                  Приема дрехи (текстил)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recycling_shoes"
                  checked={formData.recycling_shoes}
                  onChange={(e) => handleInputChange("recycling_shoes", e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded transition-all duration-200"
                />
                <label htmlFor="recycling_shoes" className="ml-2 block text-sm text-gray-700">
                  Приема обувки
                </label>
              </div>
            </div>

            <div className="animate-in slide-in-from-left duration-300" style={{ animationDelay: "250ms" }}>
              <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                Брой контейнери
              </label>
              <input
                type="number"
                id="count"
                min="1"
                value={formData.count}
                onChange={(e) => handleInputChange("count", parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900"
              />
            </div>

            {tempMarkerPosition && (
              <div
                className="bg-gray-50 p-3 rounded-md animate-in fade-in duration-300"
                style={{ animationDelay: "300ms" }}
              >
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Координати:</span> {tempMarkerPosition[0].toFixed(6)},{" "}
                  {tempMarkerPosition[1].toFixed(6)}
                </p>
              </div>
            )}

            <div
              className="flex gap-3 pt-4 animate-in slide-in-from-bottom duration-300"
              style={{ animationDelay: "350ms" }}
            >
              <button
                type="button"
                onClick={handleModalCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
              >
                Отказ
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              >
                Добави
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
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

  // Състояния за управление на формата за нов маркер
  const [tempMarkerPosition, setTempMarkerPosition] = useState<[number, number] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<BinFormData>({
    amenity: "recycling",
    recycling_type: "",
    operator: "",
    recycling_clothes: false,
    recycling_shoes: false,
    count: 1,
  })

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

      const types = bin.tags?.recycling_type?.split(",") ?? []
      types.forEach((type: string) => {
        materials.add(type.trim().toLowerCase())
      })

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
    return bins.filter((bin) => binAcceptsMaterial(bin, allKeywords))
  }, [bins, activeFilters, binAcceptsMaterial])

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

  /* Нулиране на изгледа */
  const handleZoomHome = () => {
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true })
  }

  const handleMapClick = useCallback((latlng: L.LatLng) => {
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
  }, [])

  const generateRandomCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!tempMarkerPosition) return

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

      // затваряне на модал
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
    },
    [tempMarkerPosition, formData, onNewBinCreated],
  )

  const handleInputChange = useCallback((field: keyof BinFormData, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

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
      >
        <Home className="w-5 h-5 text-gray-700" />
      </button>

      {/* Копче за показване/скриване на филтрите */}
      <button
        onClick={() => setShowFilterPanel(!showFilterPanel)}
        className="absolute top-[120px] left-[10px] z-[1000] bg-white p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors"
        title="Филтри"
      >
        <Filter className="w-5 h-5 text-gray-700" />
        {activeFilters.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilters.length}
          </span>
        )}
      </button>

      {/* Панел с филтри - теперь отдельный компонент */}
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

      {/* Модальное окно - теперь отдельный компонент */}
      <AddBinModal
        isModalOpen={isModalOpen}
        tempMarkerPosition={tempMarkerPosition}
        formData={formData}
        handleModalCancel={handleModalCancel}
        handleFormSubmit={handleFormSubmit}
        handleInputChange={handleInputChange}
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
          url={
            jawgApiKey
              ? `https://tile.jawg.io/jawg-${prefersDark ? "dark" : "lagoon"}/{z}/{x}/{y}.png?access-token=${jawgApiKey}`
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Локация на потребителя */}
        {userLocation && <Marker position={userLocation} icon={UserMarkerIcon} />}

        {tempMarkerPosition && (
          <Marker position={tempMarkerPosition} icon={tempMarkerIcon}>
            <Popup>
              <div className="p-2 text-center">
                <p className="text-sm font-medium text-orange-600">New bin location</p>
                <p className="text-xs text-gray-500">Fill the form to add</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Viewport-aware маркери - показват се само тези в зоната на виждане */}
        <ViewportAwareMarkers filteredBins={filteredBins} zoom={zoom} />
      </MapContainer>
    </div>
  )
}