"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { renderToString } from "react-dom/server";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Recycle, Home, Filter, X } from "lucide-react";

/* Интерфейс за типизация */
export interface Bin {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, any>;
  osm_type: "node" | "way" | "relation";
}
interface MapProps {
  bins: Bin[];
}

/* Стандартни цветове за рециклиране - от 400 до 500 */
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
};

/* Мапиране на цветове от OSM */
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
};

/* Опции за филтриране */
const FILTER_OPTIONS = [
  { id: "paper", label: "Хартия", color: "bg-gradient-to-r from-blue-400 to-blue-500", keywords: ["paper", "cardboard"] },
  { id: "plastic", label: "Пластмаса", color: "bg-gradient-to-r from-yellow-400 to-yellow-500", keywords: ["plastic"] },
  { id: "glass", label: "Стъкло", color: "bg-gradient-to-r from-green-400 to-green-500", keywords: ["glass"] },
  { id: "metal", label: "Метал", color: "bg-gradient-to-r from-gray-400 to-gray-500", keywords: ["metal", "aluminum", "aluminium"] },
  { id: "organic", label: "Органични", color: "bg-gradient-to-r from-amber-400 to-amber-500", keywords: ["organic", "bio", "compost"] },
  { id: "electronics", label: "Електроника", color: "bg-gradient-to-r from-purple-400 to-purple-500", keywords: ["electronics", "batteries", "e_waste", "weee"] },
  { id: "textiles", label: "Текстил", color: "bg-gradient-to-r from-pink-400 to-pink-500", keywords: ["textiles", "clothing"] },
  { id: "general", label: "Общи отпадъци", color: "bg-gradient-to-r from-red-400 to-red-500", keywords: ["general", "residual"] },
];

/* Общ wrapper за маркери */
const MarkerWrapper = ({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) => (
  <div className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center ${color}`}>
    {children}
  </div>
);

/* Функция за иконка за рециклиране */
const RecyclingIconContent = ({ color }: { color: string }) => (
  <MarkerWrapper color={color}>
    <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
  </MarkerWrapper>
);

/* Функция за иконка за боклук */
const TrashIconContent = ({ color }: { color: string }) => (
  <MarkerWrapper color={color}>
    <Trash2 className="w-5 h-5 text-white" />
  </MarkerWrapper>
);

/* Иконка за местоположението на потребителя */
const UserMarkerIcon = L.divIcon({
  html: renderToString(
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-lg flex items-center justify-center">
      <Home className="w-5 h-5 text-white" />
    </div>
  ),
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

/* Функция за наблюдение на zoom */
function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoom(e.target.getZoom());
    },
  });
  return null;
}

/* Помощна функция за получаване на цвят за кошче */
const getColorForBin = (bin: Bin): string => {
  if (bin.tags?.colour) {
    const osmColor = bin.tags.colour.toLowerCase();
    return OSM_COLOR_MAPPING[osmColor] || RECYCLING_COLORS.unknown;
  }

  const types = bin.tags?.recycling_type?.split(",") ?? [];
  for (const type of types) {
    const cleanType = type.trim().toLowerCase();
    if (RECYCLING_COLORS[cleanType]) {
      return RECYCLING_COLORS[cleanType];
    }
  }

  const recyclingTags = Object.keys(bin.tags).filter(key => 
    key.startsWith("recycling:") && bin.tags[key] === "yes"
  );
  
  for (const tag of recyclingTags) {
    const material = tag.replace("recycling:", "").trim().toLowerCase();
    if (RECYCLING_COLORS[material]) {
      return RECYCLING_COLORS[material];
    }
    
    if (material.includes("paper") || material.includes("cardboard")) {
      return RECYCLING_COLORS.paper;
    } else if (material.includes("plastic")) {
      return RECYCLING_COLORS.plastic;
    } else if (material.includes("metal") || material.includes("aluminum") || material.includes("aluminium")) {
      return RECYCLING_COLORS.metal;
    } else if (material.includes("glass")) {
      return RECYCLING_COLORS.glass;
    } else if (material.includes("organic") || material.includes("bio") || material.includes("compost")) {
      return RECYCLING_COLORS.organic;
    } else if (material.includes("electr") || material.includes("e_waste") || material.includes("weee")) {
      return RECYCLING_COLORS.electronics;
    }
  }

  const amenity = bin.tags?.amenity?.toLowerCase();
  if (amenity === "waste_basket" || amenity === "waste_basket;recycling") {
    return RECYCLING_COLORS.waste_basket;
  } else if (amenity === "recycling") {
    return RECYCLING_COLORS.center;
  }

  return RECYCLING_COLORS.unknown;
};

/* Помощна функция за създаване на иконка */
const createIconForBin = (bin: Bin): L.DivIcon => {
  const color = getColorForBin(bin);
  const isTrash = bin.tags?.amenity === "waste_basket";
  const html = renderToString(
    isTrash
      ? <TrashIconContent color={color} />
      : <RecyclingIconContent color={color} />
  );

  return L.divIcon({
    html,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

/* Главна функция */
export default function MapComponent({ bins }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const jawgApiKey = process.env.JAWG_KEY;

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [prefersDark, setPrefersDark] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const DEFAULT_CENTER: [number, number] = [43.2141, 27.9147];
  const DEFAULT_ZOOM = 12;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  /* Кеш за иконите - създава се веднъж при зареждане */
  const iconCache = useMemo(() => {
    const cache = new Map<number, L.DivIcon>();
    bins.forEach((bin) => {
      cache.set(bin.id, createIconForBin(bin));
    });
    return cache;
  }, [bins]);

  /* Кеш за информацията дали кошче приема материали - оптимизация */
  const binMaterialCache = useMemo(() => {
    const cache = new Map<number, Set<string>>();
    
    bins.forEach((bin) => {
      const materials = new Set<string>();
      
      // Проверка за recycling_type
      const types = bin.tags?.recycling_type?.split(",") ?? [];
      types.forEach((type: string) => {
        materials.add(type.trim().toLowerCase());
      });
      
      // Проверка за recycling: тагове
      Object.keys(bin.tags).forEach(key => {
        if (key.startsWith("recycling:") && bin.tags[key] === "yes") {
          const material = key.replace("recycling:", "").trim().toLowerCase();
          materials.add(material);
        }
      });
      
      cache.set(bin.id, materials);
    });
    
    return cache;
  }, [bins]);

  /* Тъмен режим – безопасно за SSR */
  useEffect(() => {
    setPrefersDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  /* Получаване на текущата локация */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(loc);
        mapRef.current?.setView(loc, DEFAULT_ZOOM);
      },
      (err) => console.warn("Грешка при геолокация:", err)
    );
  }, []);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (isMounted && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [isMounted]);

  /* Проверка дали кошче приема материали - оптимизирана версия */
  const binAcceptsMaterial = useCallback((bin: Bin, materialKeywords: string[]): boolean => {
    const materials = binMaterialCache.get(bin.id);
    if (!materials) return false;
    
    // Проверка за всяка ключова дума
    for (const keyword of materialKeywords) {
      // Директна проверка в Set
      if (materials.has(keyword)) return true;
      
      // Проверка за частично съвпадение
      for (const material of materials) {
        if (material.includes(keyword) || keyword.includes(material)) {
          return true;
        }
      }
    }
    
    return false;
  }, [binMaterialCache]);

  /* Филтриране на кошчетата - оптимизирано */
  const filteredBins = useMemo(() => {
    if (activeFilters.length === 0) return bins;

    // Събира всички ключови думи от активните филтри
    const allKeywords: string[] = [];
    activeFilters.forEach(filterId => {
      const filter = FILTER_OPTIONS.find(f => f.id === filterId);
      if (filter) {
        allKeywords.push(...filter.keywords);
      }
    });

    // Филтриране
    return bins.filter(bin => binAcceptsMaterial(bin, allKeywords));
  }, [bins, activeFilters, binAcceptsMaterial]);

  /* Превключване на филтър - оптимизирано */
  const toggleFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => {
      if (prev.includes(filterId)) {
        return prev.filter(id => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  }, []);

  /* Изчистване на всички филтри */
  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  /* Премахване на филтър */
  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  /* Нулиране на изгледа */
  const handleZoomHome = () => {
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
  };

  if (!isMounted) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">
        Картата се зарежда...
      </div>
    );
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

      {/* Панел с филтри */}
      {showFilterPanel && (
        <div className="absolute top-[160px] left-[10px] z-[1000] bg-white p-4 rounded-md shadow-lg border max-w-xs w-64">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-gray-800">Филтри за материали</h3>
            <button
              onClick={() => setShowFilterPanel(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Активни филтри */}
          {activeFilters.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Активни филтри:</span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Изчисти всички
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(filterId => {
                  const filter = FILTER_OPTIONS.find(f => f.id === filterId);
                  if (!filter) return null;
                  return (
                    <div
                      key={filterId}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
                      style={{ background: 'linear-gradient(to right, #60a5fa, #3b82f6)' }}
                    >
                      <span>{filter.label}</span>
                      <button
                        onClick={() => removeFilter(filterId)}
                        className="ml-1 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Всички филтри */}
          <div className="space-y-2">
            {FILTER_OPTIONS.map(filter => {
              const isActive = activeFilters.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className={`flex items-center justify-between w-full p-3 rounded-lg border transition-all ${
                    isActive 
                      ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-500' 
                      : 'hover:bg-gray-50 border-gray-200'
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
              );
            })}
          </div>

          {/* Информация */}
          <div className="mt-4 pt-4 border-t text-xs text-gray-600">
            <p>Показват се {filteredBins.length} от {bins.length} кошчета</p>
            {activeFilters.length > 0 && (
              <p className="mt-1">Филтрирани по: {activeFilters.map(id => FILTER_OPTIONS.find(f => f.id === id)?.label).join(', ')}</p>
            )}
          </div>
        </div>
      )}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        maxZoom={22}
        className="h-full w-full"
        ref={(map) => { if (map) mapRef.current = map; }}
      >
        <ZoomWatcher onZoom={setZoom} />

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

        {/* Показване на филтрираните кошчета само при достатъчно zoom */}
        {zoom >= 10 &&
          filteredBins.map((bin) => {
            if (bin.lat == null || bin.lon == null) return null;

            const acceptedMaterials = Object.entries(bin.tags)
              .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
              .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "));

            return (
              <Marker
                key={bin.id}
                position={[bin.lat, bin.lon]}
                icon={iconCache.get(bin.id)}
              >
                <Popup>
                  <div className="p-2 min-w-[150px]">
                    <h3 className="font-semibold text-lg text-green-600 mb-2">
                      {bin.tags?.amenity === "waste_basket"
                        ? "Кошче за боклук"
                        : "Място за рециклиране"}
                    </h3>

                    {bin.tags?.name && <p className="text-sm">{bin.tags.name}</p>}
                    {bin.tags?.opening_hours && (
                      <p className="text-xs text-gray-600">
                        Работно време: {bin.tags.opening_hours}
                      </p>
                    )}
                    {acceptedMaterials.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Приема:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {acceptedMaterials.map((material, idx) => (
                            <li key={idx} className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{
                                  backgroundColor: getMaterialColor(material.trim().toLowerCase())
                                }}
                              />
                              {material}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

/* Помощна функция за получаване на цветове за материали в popup */
function getMaterialColor(material: string): string {
  if (material.includes("paper") || material.includes("cardboard")) return "#60a5fa"; // blue-400
  if (material.includes("plastic")) return "#fbbf24"; // yellow-400
  if (material.includes("metal") || material.includes("aluminum")) return "#9ca3af"; // gray-400
  if (material.includes("glass")) return "#34d399"; // green-400
  if (material.includes("organic") || material.includes("bio") || material.includes("compost")) return "#fbbf24"; // amber-400
  if (material.includes("electr") || material.includes("batter")) return "#c084fc"; // purple-400
  if (material.includes("textile") || material.includes("cloth") || material.includes("clothes") || material.includes("shoes")) return "#f472b6"; // pink-400
  return "#9ca3af"; // gray-400 за неизвестни
}