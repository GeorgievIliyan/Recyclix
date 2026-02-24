"use client";

import type React from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { renderToString } from "react-dom/server";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import {
  Recycle,
  MapPin,
  X,
  Flag,
  PenLine,
  AlertCircle,
  CircleCheckBig,
  MapIcon,
  CheckCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import MapHome from "./MapHome";
import MapFilter from "./MapFilter";
import { isDev } from "@/lib/isDev";
import FilterPanel from "./FilterPanel";

// Типизация за данни от OpenStreetMap (OSM)
export interface Bin {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, any>;
  osm_type: "node" | "way" | "relation";
  is_smart?: boolean | null;
}

// Типизация за новосъздадени обекти в базата данни
export interface NewBin {
  id: string;
  created_at: string;
  updated_at: string;
  osm_id: string | null;
  lat: number;
  lon: number;
  tags: string;
  capacity: number | null;
  current_load: number;
  total_weight: string;
  organization_id: string | null;
  last_emptied: string | null;
  stats_today: string;
  code: string;
  image_url: string;
}

// Интерфейс за данните от формата за добавяне
interface BinFormData {
  amenity: string;
  recycling_type: string;
  operator: string;
  recycling_clothes: boolean;
  recycling_shoes: boolean;
  count: number;
}

// Пропс за компонента на картата
interface MapProps {
  bins: Bin[];
  onNewBinCreated?: (bin: NewBin) => void;
  jawgApiKey?: string;
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
};

// Дефиниция на филтриращите категории в интерфейса
export const FILTER_OPTIONS = [
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
    keywords: [
      "glass",
      "green_glass",
      "brown_glass",
      "white_glass",
      "glass_bottles",
    ],
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
    keywords: [
      "electronics",
      "batteries",
      "e_waste",
      "weee",
      "electrical_appliances",
    ],
  },
  {
    id: "textiles",
    label: "Текстил",
    color: "bg-gradient-to-r from-pink-400 to-pink-500",
    keywords: [
      "textiles",
      "clothing",
      "clothes",
      "shoes",
      "tyres",
      "tires",
      "Clothes",
      "дрехи",
      "Дрехи",
    ],
  },
];

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
  "beverage cartons": "опаковки от сок",
  "construction materials": "строителни материали",
};

const dayMap: Record<string, string> = {
  Mo: "Пон",
  Tu: "Вт",
  We: "Ср",
  Th: "Чет",
  Fr: "Пет",
  Sa: "Съб",
  Su: "Нед",
};

const translateDays = (hours: string) => {
  return hours.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (match) => dayMap[match]);
};

// Типове отчети
type ReportType =
  | "incorrect_location"
  | "bin_missing"
  | "bin_damaged"
  | "wrong_materials"
  | "overflowing"
  | "duplicate"
  | "other";

interface ReportImage {
  id: string;
  report_id: string;
  photo_url: string;
  created_at: string;
}

// Интерфейс за отчет от таблицата reports
export interface Report {
  id: string;
  user_id: string | null;
  bin_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  type: ReportType;
  description: string;
  resolved: boolean;
}

type ModalMode = "add" | "report" | "edit";

// Интерфейс за данните за редактиране
interface EditFormData {
  name: string;
  opening_hours: string;
  materials: string[];
  notes: string;
}

// Контейнер за маркери
const MarkerWrapper = ({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) => (
  <div className="relative">
    <div
      className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center relative z-10 ${color} shadow-sm`}
    >
      {children}
    </div>
  </div>
);

const RecyclingIconContent = ({ color }: { color: string }) => (
  <MarkerWrapper color={color}>
    <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
  </MarkerWrapper>
);

const TrashIconContent = ({ color }: { color: string }) => (
  <MarkerWrapper color={color}>
    <Trash2 className="w-5 h-5 text-white" />
  </MarkerWrapper>
);

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
});

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoom(e.target.getZoom());
    },
  });
  return null;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const getColorForBin = (bin: Bin): string => {
  const types =
    bin.tags?.recycling_type
      ?.split(",")
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0) ?? [];

  for (const cleanType of types) {
    if (
      cleanType === "textiles" ||
      cleanType === "clothes" ||
      cleanType === "clothing" ||
      cleanType === "дрехи" ||
      cleanType === "textile" ||
      cleanType === "tyres" ||
      cleanType === "tires" ||
      cleanType === "shoes"
    ) {
      return RECYCLING_COLORS.textiles;
    }
  }

  const recyclingTags = Object.keys(bin.tags).filter(
    (key) => key.startsWith("recycling:") && bin.tags[key] === "yes",
  );

  for (const tag of recyclingTags) {
    const material = tag.replace("recycling:", "").trim().toLowerCase();
    if (
      material === "textiles" ||
      material === "clothes" ||
      material === "clothing" ||
      material === "textile" ||
      material === "tyres" ||
      material === "tires" ||
      material === "shoes" ||
      material.includes("дрехи") ||
      material.includes("cloth")
    ) {
      return RECYCLING_COLORS.textiles;
    }
  }

  if (types.length > 1)
    return "bg-gradient-to-r from-emerald-400 to-emerald-500";
  if (recyclingTags.length > 1)
    return "bg-gradient-to-r from-emerald-400 to-emerald-500";

  const hasRecyclingTypes =
    bin.tags?.recycling_type && bin.tags.recycling_type.trim().length > 0;
  const hasRecyclingTags = recyclingTags.length > 0;

  if (!hasRecyclingTypes && !hasRecyclingTags) {
    return "bg-gradient-to-r from-emerald-400 to-emerald-500";
  }

  for (const cleanType of types) {
    if (RECYCLING_COLORS[cleanType]) return RECYCLING_COLORS[cleanType];
    if (cleanType === "paper" || cleanType === "cardboard")
      return RECYCLING_COLORS.paper;
    else if (cleanType === "plastic") return RECYCLING_COLORS.plastic;
    else if (cleanType === "glass") return RECYCLING_COLORS.glass;
    else if (
      cleanType === "metal" ||
      cleanType === "aluminum" ||
      cleanType === "aluminium"
    )
      return RECYCLING_COLORS.metal;
    else if (
      cleanType === "organic" ||
      cleanType === "bio" ||
      cleanType === "compost"
    )
      return RECYCLING_COLORS.organic;
    else if (
      cleanType === "electronics" ||
      cleanType === "e_waste" ||
      cleanType === "weee"
    )
      return RECYCLING_COLORS.electronics;
    else if (cleanType === "batteries") return RECYCLING_COLORS.batteries;
    else if (
      cleanType === "general" ||
      cleanType === "residual" ||
      cleanType === "waste"
    )
      return RECYCLING_COLORS.general;
  }

  for (const tag of recyclingTags) {
    const material = tag.replace("recycling:", "").trim().toLowerCase();
    if (RECYCLING_COLORS[material]) return RECYCLING_COLORS[material];
    if (material.includes("paper") || material.includes("cardboard"))
      return RECYCLING_COLORS.paper;
    else if (material.includes("plastic")) return RECYCLING_COLORS.plastic;
    else if (
      material.includes("metal") ||
      material.includes("aluminum") ||
      material.includes("aluminium")
    )
      return RECYCLING_COLORS.metal;
    else if (material.includes("glass")) return RECYCLING_COLORS.glass;
    else if (
      material.includes("organic") ||
      material.includes("bio") ||
      material.includes("compost")
    )
      return RECYCLING_COLORS.organic;
    else if (
      material.includes("electr") ||
      material.includes("e_waste") ||
      material.includes("weee")
    )
      return RECYCLING_COLORS.electronics;
    else if (material.includes("batter")) return RECYCLING_COLORS.batteries;
    else if (
      material.includes("general") ||
      material.includes("residual") ||
      material.includes("waste")
    )
      return RECYCLING_COLORS.general;
  }

  const amenity = bin.tags?.amenity?.toLowerCase();
  if (amenity === "waste_basket" || amenity === "waste_basket;recycling")
    return RECYCLING_COLORS.waste_basket;
  else if (amenity === "recycling")
    return "bg-gradient-to-r from-emerald-400 to-emerald-500";

  return RECYCLING_COLORS.unknown;
};

const createIconForBin = (bin: Bin): L.DivIcon => {
  const color = getColorForBin(bin);
  const isTrash = bin.tags?.amenity === "waste_basket";
  const html = renderToString(
    isTrash ? (
      <TrashIconContent color={color} />
    ) : (
      <RecyclingIconContent color={color} />
    ),
  );
  return L.divIcon({
    html,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

function getMaterialColor(material: string): string {
  if (material.includes("paper") || material.includes("cardboard"))
    return "#60a5fa";
  if (material.includes("plastic")) return "#fbbf24";
  if (material.includes("metal") || material.includes("aluminum"))
    return "#9ca3af";
  if (material.includes("glass")) return "#34d399";
  if (
    material.includes("organic") ||
    material.includes("bio") ||
    material.includes("compost")
  )
    return "#fbbf24";
  if (material.includes("electr") || material.includes("batter"))
    return "#c084fc";
  if (
    material.includes("textile") ||
    material.includes("cloth") ||
    material.includes("clothes") ||
    material.includes("shoes")
  )
    return "#f472b6";
  return "#9ca3af";
}

interface BinReportHistory {
  lastReportTime: number;
  reportCount: number;
}

const useReportSpamProtection = () => {
  const binReportHistoryRef = useRef<Map<number, BinReportHistory>>(new Map());
  const [userReportHistory, setUserReportHistory] = useState<number[]>([]);

  const LIMITS = {
    BIN_MAX_REPORTS_PER_DAY: 2,
    BIN_MIN_TIME_BETWEEN_REPORTS: 60,
    USER_MAX_REPORTS_PER_HOUR: 2,
    USER_MIN_TIME_BETWEEN_REPORTS: 60,
  };

  const canReportBin = useCallback(
    (
      binId: number,
    ): { allowed: boolean; message?: string; timeLeft?: number } => {
      const now = Date.now();
      const history = binReportHistoryRef.current.get(binId);

      if (history) {
        const timeSinceLastReport = now - history.lastReportTime;
        const reportsInLastDay = history.reportCount;

        if (
          timeSinceLastReport <
          LIMITS.BIN_MIN_TIME_BETWEEN_REPORTS * 60 * 1000
        ) {
          const minutesLeft = Math.ceil(
            (LIMITS.BIN_MIN_TIME_BETWEEN_REPORTS * 60 * 1000 -
              timeSinceLastReport) /
              (60 * 1000),
          );
          return {
            allowed: false,
            message: `Трябва да изчакате ${minutesLeft} минути преди нов отчет за това кошче.`,
            timeLeft: minutesLeft,
          };
        }

        if (reportsInLastDay >= LIMITS.BIN_MAX_REPORTS_PER_DAY) {
          return {
            allowed: false,
            message: `Достигнахте максималния брой отчети (${LIMITS.BIN_MAX_REPORTS_PER_DAY}) за това кошче за деня.`,
          };
        }
      }

      const oneHourAgo = now - 60 * 60 * 1000;
      const recentUserReports = userReportHistory.filter(
        (time) => time > oneHourAgo,
      );

      if (recentUserReports.length >= LIMITS.USER_MAX_REPORTS_PER_HOUR) {
        return {
          allowed: false,
          message: `Достигнахте лимита от ${LIMITS.USER_MAX_REPORTS_PER_HOUR} отчета на час. Моля, изчакайте.`,
        };
      }

      if (userReportHistory.length > 0) {
        const lastReportTime = userReportHistory[userReportHistory.length - 1];
        const timeSinceLastUserReport = now - lastReportTime;

        if (
          timeSinceLastUserReport <
          LIMITS.USER_MIN_TIME_BETWEEN_REPORTS * 1000
        ) {
          const secondsLeft = Math.ceil(
            (LIMITS.USER_MIN_TIME_BETWEEN_REPORTS * 1000 -
              timeSinceLastUserReport) /
              1000,
          );
          return {
            allowed: false,
            message: `Моля, изчакайте ${secondsLeft} секунди преди следващия отчет.`,
            timeLeft: secondsLeft,
          };
        }
      }

      return { allowed: true };
    },
    [userReportHistory, LIMITS],
  );

  const recordReport = useCallback((binId: number) => {
    const now = Date.now();
    const history = binReportHistoryRef.current.get(binId);

    if (history) {
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const reportCount =
        history.lastReportTime > oneDayAgo ? history.reportCount + 1 : 1;
      binReportHistoryRef.current.set(binId, {
        lastReportTime: now,
        reportCount,
      });
    } else {
      binReportHistoryRef.current.set(binId, {
        lastReportTime: now,
        reportCount: 1,
      });
    }

    setUserReportHistory((prev) => {
      const oneHourAgo = now - 60 * 60 * 1000;
      const filtered = prev.filter((time) => time > oneHourAgo);
      return [...filtered, now];
    });

    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    for (const [id, binHistory] of binReportHistoryRef.current) {
      if (binHistory.lastReportTime < oneDayAgo) {
        binReportHistoryRef.current.delete(id);
      }
    }
  }, []);

  const getLimitInfo = useCallback(
    (binId: number) => {
      const history = binReportHistoryRef.current.get(binId);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentUserReports = userReportHistory.filter(
        (time) => time > oneHourAgo,
      ).length;

      return {
        binReportsToday: history?.reportCount || 0,
        binReportsLimit: LIMITS.BIN_MAX_REPORTS_PER_DAY,
        userReportsThisHour: recentUserReports,
        userReportsLimit: LIMITS.USER_MAX_REPORTS_PER_HOUR,
      };
    },
    [userReportHistory, LIMITS],
  );

  return {
    canReportBin,
    recordReport,
    getLimitInfo,
    clearBinHistory: (binId: number) =>
      binReportHistoryRef.current.delete(binId),
    clearUserHistory: () => setUserReportHistory([]),
  };
};

const ViewportAwareMarkers = memo(function ViewportAwareMarkers({
  filteredBins,
  zoom,
  onReport,
  onEdit,
  isReportDisabled,
}: {
  filteredBins: Bin[];
  zoom: number;
  onReport: (bin: Bin) => void;
  onEdit: (bin: Bin) => void;
  isReportDisabled: (binId: number) => boolean;
}) {
  const map = useMap();
  const [visibleBins, setVisibleBins] = useState<Bin[]>([]);
  const prevFilteredBinsRef = useRef<Bin[]>([]);
  const prevZoomRef = useRef<number>(zoom);

  const updateVisibleBins = useCallback(() => {
    if (!map || zoom < 10) {
      if (visibleBins.length > 0) setVisibleBins([]);
      return;
    }

    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoomLevel = map.getZoom();
    const maxMarkers = zoomLevel < 13 ? 50 : zoomLevel < 15 ? 100 : 200;

    const inViewport = filteredBins
      .filter((bin) => {
        if (
          bin.lat == null ||
          bin.lon == null ||
          isNaN(bin.lat) ||
          isNaN(bin.lon)
        )
          return false;
        const latDiff = Math.abs(bin.lat - center.lat);
        const lngDiff = Math.abs(bin.lon - center.lng);
        if (latDiff > 0.1 || lngDiff > 0.1) return false;
        return bounds.contains([bin.lat, bin.lon]);
      })
      .slice(0, maxMarkers);

    const hasChanged =
      visibleBins.length !== inViewport.length ||
      !visibleBins.every((bin, index) => bin.id === inViewport[index]?.id);

    if (hasChanged) setVisibleBins(inViewport);
  }, [map, zoom, filteredBins, visibleBins]);

  useEffect(() => {
    if (zoom < 10) {
      if (visibleBins.length > 0) setVisibleBins([]);
      return;
    }

    const filteredBinsChanged =
      prevFilteredBinsRef.current.length !== filteredBins.length ||
      !prevFilteredBinsRef.current.every(
        (bin, index) => bin.id === filteredBins[index]?.id,
      );

    const zoomChanged = prevZoomRef.current !== zoom;

    if (filteredBinsChanged || zoomChanged) {
      const timeoutId = setTimeout(updateVisibleBins, 100);
      prevFilteredBinsRef.current = filteredBins;
      prevZoomRef.current = zoom;
      return () => clearTimeout(timeoutId);
    }
  }, [updateVisibleBins, zoom, filteredBins, visibleBins.length]);

  useEffect(() => {
    if (!map || zoom < 10) return;
    map.on("moveend", updateVisibleBins);
    return () => {
      map.off("moveend", updateVisibleBins);
    };
  }, [map, zoom, updateVisibleBins]);

  useEffect(() => {
    if (map && zoom >= 10) {
      const timeoutId = setTimeout(updateVisibleBins, 300);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  if (zoom < 10) return null;

  return (
    <>
      {visibleBins.map((bin) => {
        if (
          bin.lat == null ||
          bin.lon == null ||
          isNaN(bin.lat) ||
          isNaN(bin.lon)
        )
          return null;

        const acceptedMaterials = Object.entries(bin.tags)
          .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
          .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "));

        const isReportDisabledForThisBin = isReportDisabled(bin.id);

        const popupContent = (
          <div className="relative py-4 px-3 w-[85vw] max-w-[320px] sm:w-[260px] break-words dark:bg-neutral-800 bg-white dark:text-white text-gray-900 rounded-lg">
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                className={`p-1.5 rounded-md transition ${
                  isReportDisabledForThisBin
                    ? "bg-gray-100 dark:bg-neutral-700 text-gray-400 dark:text-neutral-400 cursor-not-allowed"
                    : "hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600 dark:hover:text-red-500"
                }`}
                title={
                  isReportDisabledForThisBin
                    ? "Отчетът е временно деактивиран"
                    : "Докладвай проблем"
                }
                onClick={() => !isReportDisabledForThisBin && onReport(bin)}
                disabled={isReportDisabledForThisBin}
              >
                <Flag className="w-4 h-4" />
              </button>

              <button
                className="p-1.5 rounded-md hover:bg-green-100 hover:text-green-500 text-gray-600 dark:text-neutral-300 transition dark:hover:bg-green-500/10 dark:hover:text-green-500 duration-150"
                title="Предложи редактиране"
                onClick={() => onEdit(bin)}
              >
                <PenLine className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`flex gap-3 pr-12 ${!bin.tags?.name ? "items-center" : "items-start"}`}
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColorForBin(bin)}`}
              >
                {bin.tags?.amenity === "waste_basket" ? (
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Recycle
                    className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                    strokeWidth={2.5}
                  />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white leading-tight">
                  {bin.tags?.amenity === "waste_basket"
                    ? "Кошче за боклук"
                    : "Място за рециклиране"}
                </h3>
                {bin.tags?.name && (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-neutral-300 mt-0.5">
                    {bin.tags.name}
                  </p>
                )}
              </div>
            </div>

            {(bin.tags?.opening_hours ||
              (acceptedMaterials && acceptedMaterials.length > 0)) && (
              <div className="mt-4">
                {bin.tags?.opening_hours && (
                  <div className="bg-blue-50 dark:bg-blue-800/20 p-2 rounded-md">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
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
                      <span className="leading-tight">
                        <span className="opacity-80">Работно време:</span>{" "}
                        <span className="font-semibold">
                          {translateDays(bin.tags.opening_hours)}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {bin.is_smart && (
                  <div className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white flex gap-2 items-center mb-0">
                    <CheckCircle className="text-green-500 h-4 w-4" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                      Smart
                    </span>{" "}
                    кош
                  </div>
                )}

                {acceptedMaterials?.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white flex gap-2 items-center">
                      <CircleCheckBig className="text-green-500 w-4 h-4" />
                      <p>Приема:</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {acceptedMaterials.map((material, idx) => {
                        const translated =
                          materialTranslations[material.trim().toLowerCase()] ||
                          material;
                        const color = getMaterialColor(material);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm"
                            style={{
                              backgroundColor: `${color}20`,
                              color: color,
                              border: `1px solid ${color}40`,
                              fontWeight: "540",
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {translated}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <a
              href={`https://www.google.com/maps?q=${bin.lat},${bin.lon}&z=14`}
              target="_blank"
              rel="noopener noreferrer"
              className="!text-green-500 !mt-5 !font-semibold !flex !gap-1"
            >
              <MapIcon className="!text-green-500 !h-4 !w-4" />
              Google Maps
            </a>
          </div>
        );

        return (
          <Marker
            key={bin.id}
            position={[bin.lat, bin.lon]}
            icon={createIconForBin(bin)}
            eventHandlers={{
              click: (e) => {
                e.target.openPopup();
              },
            }}
          >
            <Popup>{popupContent}</Popup>
          </Marker>
        );
      })}
    </>
  );
});

// Функция за проверка на администраторски статус
const checkAdminStatus = async (
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string,
): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    return data?.is_admin === true;
  } catch (error) {
    if (isDev) console.error("Error checking admin status:", error);
    return false;
  }
};

// Функция за получаване на отчети за кош
const getBinReports = async (
  supabase: ReturnType<typeof createBrowserClient>,
  binId: string,
): Promise<Report[]> => {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("bin_id", binId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Грешка при зареждане на отчети:", error);
    return [];
  }
};

// Модален прозорец
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
  isModalOpen: boolean;
  modalMode: ModalMode;
  tempMarkerPosition: [number, number] | null;
  formData: BinFormData;
  reportData: { type: string; title: string; description: string };
  editData: EditFormData;
  handleModalCancel: () => void;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleInputChange: (
    field: keyof BinFormData,
    value: string | boolean | number,
  ) => void;
  updateReport: (key: string, value: string) => void;
  updateEdit: (key: string, value: string | string[]) => void;
  isSubmitting?: boolean;
  reportLimitsInfo?: {
    binReportsToday: number;
    binReportsLimit: number;
    userReportsThisHour: number;
    userReportsLimit: number;
  };
  reportImages: File[];
  uploadingImages: boolean;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: (index: number) => void;
  binImages?: File[];
  uploadingBinImages?: boolean;
  handleBinImageSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveBinImage?: (index: number) => void;
}) {
  const [materialsInput, setMaterialsInput] = useState(
    editData.materials.join(", "),
  );
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 dark:bg-neutral-800 dark:text-white">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Trash2 className="text-green-500" />
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
                      • Отчети за това кошче днес:{" "}
                      {reportLimitsInfo.binReportsToday}/
                      {reportLimitsInfo.binReportsLimit}
                    </p>
                    <p>
                      • Ваши отчети този час:{" "}
                      {reportLimitsInfo.userReportsThisHour}/
                      {reportLimitsInfo.userReportsLimit}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Тип проблем
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Заглавие
                  </label>
                  <input
                    value={reportData.title}
                    onChange={(e) => updateReport("title", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                    placeholder="Напр. Кошчето е препълнено"
                    disabled={isSubmitting || uploadingImages}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Описание (по избор)
                  </label>
                  <textarea
                    value={reportData.description}
                    onChange={(e) =>
                      updateReport("description", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Опишете по-подробно проблема..."
                    disabled={isSubmitting || uploadingImages}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Снимка
                  </label>
                  <div className="space-y-3">
                    {reportImages.length < 5 && (
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
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
                              src={
                                URL.createObjectURL(image) || "/placeholder.svg"
                              }
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-neutral-700"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center w-5 h-5"
                              disabled={isSubmitting || uploadingBinImages}
                            >
                              <X
                                className="w-4 h-4 text-red-500"
                                strokeWidth={3}
                              />
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Име на обекта (по избор)
                  </label>
                  <input
                    value={editData.name}
                    onChange={(e) => updateEdit("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Например: Рециклиране за квартал 'Младост'"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Работно време (по избор)
                  </label>
                  <input
                    value={editData.opening_hours}
                    onChange={(e) =>
                      updateEdit("opening_hours", e.target.value)
                    }
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Въведете материали, разделени със запетая
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Допълнителни бележки
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Тип съоръжение
                  </label>
                  <select
                    value={formData.amenity}
                    onChange={(e) =>
                      handleInputChange("amenity", e.target.value)
                    }
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип рециклиране
                  </label>
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
                      {
                        value: "органични отпадъци",
                        label: "Органични отпадъци",
                      },
                      { value: "общи отпадъци", label: "Общи отпадъци" },
                    ].map((option) => {
                      const currentTypes = formData.recycling_type
                        ? formData.recycling_type
                            .split(",")
                            .map((t) => t.trim())
                        : [];
                      const isChecked = currentTypes.includes(option.value);
                      return (
                        <div key={option.value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`recycling-${option.value}`}
                            checked={isChecked}
                            onChange={(e) => {
                              const currentTypes = formData.recycling_type
                                ? formData.recycling_type
                                    .split(",")
                                    .map((t) => t.trim())
                                : [];
                              const newTypes = e.target.checked
                                ? [...currentTypes, option.value]
                                : currentTypes.filter(
                                    (t) => t !== option.value,
                                  );
                              handleInputChange(
                                "recycling_type",
                                newTypes.join(", "),
                              );
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Оператор
                  </label>
                  <input
                    value={formData.operator}
                    onChange={(e) =>
                      handleInputChange("operator", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md text-gray-900 dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Име на организацията"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Брой контейнери
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.count}
                    onChange={(e) =>
                      handleInputChange(
                        "count",
                        Number.parseInt(e.target.value) || 1,
                      )
                    }
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
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
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
                              onLoad={(e) =>
                                URL.revokeObjectURL(e.currentTarget.src)
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveBinImage &&
                                handleRemoveBinImage(index)
                              }
                              className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center w-5 h-5"
                              disabled={isSubmitting || uploadingBinImages}
                            >
                              <X
                                className="w-4 h-4 text-red-500"
                                strokeWidth={3}
                              />
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
  );
});

// Основен компонент за картата
export default function MapComponent({
  bins,
  onNewBinCreated,
  jawgApiKey,
}: MapProps) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const mapRef = useRef<L.Map | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [binImages, setBinImages] = useState<File[]>([]);
  const [uploadingBinImages, setUploadingBinImages] = useState(false);

  const handleBinImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    setBinImages((prev) => [...prev, ...filesArray].slice(0, 5));
  };

  const handleRemoveBinImage = (index: number) => {
    setBinImages((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const applyPopupStyles = () => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        document
          .querySelectorAll(".leaflet-popup")
          .forEach((popup) => popup.classList.add("dark-mode-popup"));
      }
    };
    applyPopupStyles();
    const interval = setInterval(applyPopupStyles, 500);
    return () => clearInterval(interval);
  }, []);

  const validBins = useMemo(
    () =>
      bins.filter(
        (bin) =>
          bin.lat != null &&
          bin.lon != null &&
          !isNaN(bin.lat) &&
          !isNaN(bin.lon),
      ),
    [bins],
  );

  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [prefersDark, setPrefersDark] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const DEFAULT_CENTER: [number, number] = [42.6, 25.11];
  const DEFAULT_ZOOM = 8;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [binReports, setBinReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const [reportImages, setReportImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [tempMarkerPosition, setTempMarkerPosition] = useState<
    [number, number] | null
  >(null);
  const [formData, setFormData] = useState<BinFormData>({
    amenity: "recycling",
    recycling_type: "",
    operator: "",
    recycling_clothes: false,
    recycling_shoes: false,
    count: 1,
  });

  const [reportData, setReportData] = useState({
    type: "",
    title: "",
    description: "",
  });
  const [editData, setEditData] = useState<EditFormData>({
    name: "",
    opening_hours: "",
    materials: [],
    notes: "",
  });

  const spamProtection = useReportSpamProtection();

  useEffect(() => {
    return () => {
      binImages.forEach((image) => {
        if (image instanceof File)
          URL.revokeObjectURL(URL.createObjectURL(image));
      });
      reportImages.forEach((image) => {
        if (image instanceof File)
          URL.revokeObjectURL(URL.createObjectURL(image));
      });
    };
  }, [binImages, reportImages]);

  const tempMarkerIcon = useMemo(() => {
    const html = renderToString(
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            border: "2px solid rgba(255, 255, 255, 0.5)",
            margin: "-2px",
          }}
        />
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-lg flex items-center justify-center relative z-10">
          <Recycle className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>,
    );
    return L.divIcon({
      html,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }, []);

  const binMaterialCache = useMemo(() => {
    const cache = new Map<number, Set<string>>();
    validBins.forEach((bin) => {
      const materials = new Set<string>();
      if (bin.tags?.recycling_type) {
        bin.tags.recycling_type
          .split(",")
          .forEach((type: string) => materials.add(type.trim().toLowerCase()));
      }
      Object.keys(bin.tags).forEach((key) => {
        if (key.startsWith("recycling:") && bin.tags[key] === "yes") {
          materials.add(key.replace("recycling:", "").trim().toLowerCase());
        }
      });
      cache.set(bin.id, materials);
    });
    return cache;
  }, [validBins]);

  useEffect(() => {
    setPrefersDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(loc);
        if (mapRef.current) {
          mapRef.current.flyTo(loc, 16, {
            duration: 2.75,
            easeLinearity: 0.25,
            animate: true,
          });
        }
      },
      (err) => console.warn("Грешка при геолокация:", err),
      { enableHighAccuracy: true },
    );
  }, []);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (isMounted && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [isMounted]);

  const filteredBins = useMemo(() => {
    if (activeFilters.length === 0) return validBins;
    return validBins.filter((bin) => {
      const materials = binMaterialCache.get(bin.id);
      if (!materials) return false;
      return activeFilters.every((filterId) => {
        const filter = FILTER_OPTIONS.find((f) => f.id === filterId);
        if (!filter) return false;
        return filter.keywords.some((keyword) => {
          if (materials.has(keyword)) return true;
          for (const material of materials) {
            if (material.includes(keyword) || keyword.includes(material))
              return true;
          }
          return false;
        });
      });
    });
  }, [validBins, activeFilters, binMaterialCache]);

  const toggleFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  }, []);

  const clearAllFilters = useCallback(() => setActiveFilters([]), []);
  const removeFilter = useCallback(
    (filterId: string) =>
      setActiveFilters((prev) => prev.filter((id) => id !== filterId)),
    [],
  );

  const loadBinReports = useCallback(
    async (binId: string) => {
      if (!binId) return;
      setIsLoadingReports(true);
      try {
        const reports = await getBinReports(supabase, binId);
        setBinReports(reports);
      } catch (error) {
        console.error("Грешка при зареждане на отчети:", error);
      } finally {
        setIsLoadingReports(false);
      }
    },
    [supabase],
  );

  const handleZoomHome = () => {
    const map = mapRef.current;
    if (!map) return;
    const previousBounds = map.getBounds();
    let isLocationFound = false;

    const onLocationFound = (e: L.LocationEvent) => {
      isLocationFound = true;
      map.flyTo(e.latlng, 20, {
        animate: true,
        duration: 2.5,
        easeLinearity: 0.25,
        noMoveStart: true,
      });
    };
    const onLocationError = (e: L.ErrorEvent) =>
      console.warn("Грешка при определяне на локация:", e.message);

    map.once("locationfound", onLocationFound);
    map.once("locationerror", onLocationError);
    map.locate({
      setView: false,
      watch: false,
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const fallbackTimeoutId = setTimeout(() => {
      if (!isLocationFound && map) {
        map.off("locationfound", onLocationFound);
        map.off("locationerror", onLocationError);
        map.flyToBounds(previousBounds, {
          animate: true,
          duration: 1.5,
          padding: [50, 50],
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
    setModalMode("add");
    setTempMarkerPosition([latlng.lat, latlng.lng]);
    setIsModalOpen(true);
    setFormData({
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    });
  }, []);

  const handleModalCancel = useCallback(() => {
    if (isSubmitting || uploadingImages) return;
    setIsModalOpen(false);
    setTempMarkerPosition(null);
    setSelectedBin(null);
    setIsSubmitting(false);
    setReportData({ type: "", title: "", description: "" });
    setReportImages([]);
    setEditData({ name: "", opening_hours: "", materials: [], notes: "" });
    setFormData({
      amenity: "recycling",
      recycling_type: "",
      operator: "",
      recycling_clothes: false,
      recycling_shoes: false,
      count: 1,
    });
    setBinReports([]);
  }, [isSubmitting, uploadingImages]);

  const handleReport = useCallback(
    (bin: Bin) => {
      const canReport = spamProtection.canReportBin(bin.id);
      if (!canReport.allowed) {
        alert(canReport.message || "Отчетът не е позволен в момента.");
        return;
      }
      setSelectedBin(bin);
      setModalMode("report");
      setIsModalOpen(true);
      setReportData({ type: "", title: "", description: "" });
      loadBinReports(bin.id.toString());
    },
    [spamProtection, loadBinReports],
  );

  const handleEdit = useCallback((bin: Bin) => {
    setSelectedBin(bin);
    setModalMode("edit");
    setIsModalOpen(true);
    const currentMaterials = Object.entries(bin.tags)
      .filter(([k, v]) => k.startsWith("recycling:") && v === "yes")
      .map(([k]) => k.replace("recycling:", "").replace(/_/g, " "));
    setEditData({
      name: bin.tags?.name || "",
      opening_hours: bin.tags?.opening_hours || "",
      materials: currentMaterials,
      notes: "",
    });
  }, []);

  const updateReport = useCallback(
    (key: string, value: string) =>
      setReportData((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const updateEdit = useCallback(
    (key: string, value: string | string[]) =>
      setEditData((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const isReportDisabled = useCallback(
    (binId: number): boolean => !spamProtection.canReportBin(binId).allowed,
    [spamProtection],
  );

  const generateRandomCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++)
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const submitReportToSupabase = async (reportPayload: {
    bin_id: string;
    type: ReportType;
    title: string;
    description?: string | null;
  }) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      const { data: reportDataResult, error: reportError } = await supabase
        .from("reports")
        .insert([
          {
            bin_id: reportPayload.bin_id,
            type: reportPayload.type,
            title: reportPayload.title,
            description: reportPayload.description,
            user_id: userId,
            resolved: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();

      if (reportError) throw reportError;

      if (reportImages.length > 0 && reportDataResult?.[0]) {
        setUploadingImages(true);
        const reportId = reportDataResult[0].id;

        for (const image of reportImages) {
          const fileExt = image.name.split(".").pop();
          const fileName = `${reportId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("report-photos")
            .upload(fileName, image);
          if (uploadError) {
            console.error("Storage error:", uploadError);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("report-photos").getPublicUrl(fileName);
          await supabase.from("report_photos").insert([
            {
              report_id: reportId,
              photo_url: publicUrl,
              user_id: userId,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setUploadingImages(false);
        setReportImages([]);
      }

      return reportDataResult;
    } catch (error: any) {
      console.error("Full Report Error:", error);
      throw error;
    }
  };

  const submitEditSuggestionToSupabase = async (editPayload: {
    bin_id: string;
    name?: string;
    opening_hours?: string;
    materials?: string[];
    notes?: string;
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const { data, error } = await supabase
      .from("edit_suggestions")
      .insert([
        {
          bin_id: editPayload.bin_id,
          name: editPayload.name,
          opening_hours: editPayload.opening_hours,
          materials: editPayload.materials?.join(", "),
          notes: editPayload.notes,
          user_id: userId,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data;
  };

  const submitBinToPending = async (binData: {
    lat: number;
    lon: number;
    tags: any;
    code: string;
    images?: File[];
  }) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      const { data, error: insertError } = await supabase
        .from("pending_bins")
        .insert({
          user_id: userId,
          lat: binData.lat,
          lon: binData.lon,
          tags:
            typeof binData.tags === "object"
              ? JSON.stringify(binData.tags)
              : binData.tags,
          code: binData.code,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select();

      if (insertError) throw insertError;
      const newBin = data[0];

      if (binData.images && binData.images.length > 0) {
        setUploadingBinImages(true);
        try {
          for (const image of binData.images) {
            const fileExt = image.type.split("/").pop() ?? "jpg";
            const fileName = `${newBin.id}-${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("bins")
              .upload(fileName, image, { upsert: false });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              continue;
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("bins").getPublicUrl(fileName);

            const { data: updateData, error: updateError } = await supabase
              .from("pending_bins")
              .update({
                image_url: publicUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", newBin.id)
              .select();

            if (updateError && isDev) {
              console.error("Image URL update error:", updateError);
            }
          }
        } finally {
          setUploadingBinImages(false);
        }
      }

      return data;
    } catch (error: any) {
      console.error("Pending Bin Error:", error);
      throw error;
    }
  };

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || uploadingImages) return;

      setIsSubmitting(true);

      try {
        if (modalMode === "report") {
          if (!selectedBin) throw new Error("Грешка: Не е избрано кошче.");

          const canReport = spamProtection.canReportBin(selectedBin.id);
          if (!canReport.allowed)
            throw new Error(canReport.message || "Отчетът вече не е позволен.");

          await submitReportToSupabase({
            bin_id: selectedBin.id.toString(),
            type: reportData.type as ReportType,
            title: reportData.title,
            description: reportData.description || null,
          });

          spamProtection.recordReport(selectedBin.id);
          alert(
            "Отчетът е изпратен успешно! Може да бъде прегледан от администратор.",
          );
          setIsModalOpen(false);
          setReportData({ type: "", title: "", description: "" });
          setReportImages([]);
          loadBinReports(selectedBin.id.toString());
          setSelectedBin(null);
          return;
        }

        if (modalMode === "edit") {
          if (!selectedBin) throw new Error("Грешка: Не е избрано кошче.");

          await submitEditSuggestionToSupabase({
            bin_id: selectedBin.id.toString(),
            name: editData.name || undefined,
            opening_hours: editData.opening_hours || undefined,
            materials: editData.materials,
            notes: editData.notes || undefined,
          });

          alert(
            "Предложението за редактиране е изпратено успешно! Може да бъде прегледано от администратор.",
          );
          setIsModalOpen(false);
          setEditData({
            name: "",
            opening_hours: "",
            materials: [],
            notes: "",
          });
          setSelectedBin(null);
          return;
        }

        if (!tempMarkerPosition)
          throw new Error("Локацията на кошчето не е зададена.");

        const tags = {
          amenity: formData.amenity,
          recycling_type: formData.recycling_type,
          operator: formData.operator,
          "recycling:clothes": formData.recycling_clothes ? "yes" : "no",
          "recycling:shoes": formData.recycling_shoes ? "yes" : "no",
          count: String(formData.count),
        };

        const code = generateRandomCode();

        const result = await submitBinToPending({
          lat: tempMarkerPosition[0],
          lon: tempMarkerPosition[1],
          tags,
          code,
          images: binImages,
        });

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
          };
          onNewBinCreated(newBin);
        }

        setIsModalOpen(false);
        setTempMarkerPosition(null);
        setFormData({
          amenity: "recycling",
          recycling_type: "",
          operator: "",
          recycling_clothes: false,
          recycling_shoes: false,
          count: 1,
        });
        setBinImages([]);
        alert(
          "Кошчето е добавено успешно! Ще бъде прегледано от администратор преди да се появи на картата.",
        );
      } catch (error: any) {
        console.error("Грешка при изпращане на формата:", error);
        alert(`Грешка: ${error.message || "Моля, опитайте отново."}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      uploadingImages,
      modalMode,
      reportData,
      selectedBin,
      editData,
      tempMarkerPosition,
      formData,
      binImages,
      spamProtection,
      onNewBinCreated,
      loadBinReports,
    ],
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newImages = Array.from(files).slice(0, 5 - reportImages.length);
        setReportImages((prev) => [...prev, ...newImages]);
      }
    },
    [reportImages.length],
  );

  const handleRemoveImage = useCallback(
    (index: number) =>
      setReportImages((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const handleInputChange = useCallback(
    (field: keyof BinFormData, value: string | boolean | number) =>
      setFormData((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const reportLimitsInfo = useMemo(() => {
    if (!selectedBin) return undefined;
    return spamProtection.getLimitInfo(selectedBin.id);
  }, [selectedBin, spamProtection]);

  const getUnresolvedReportsCount = useMemo(
    () => binReports.filter((r) => !r.resolved).length,
    [binReports],
  );
  const getTotalReportsCount = useMemo(() => binReports.length, [binReports]);

  if (!isMounted) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">
        Картата се зарежда...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapHome
        onZoomHome={handleZoomHome}
        isSubmitting={isSubmitting}
        uploadingImages={uploadingImages}
      />
      <MapFilter
        setShowFilterPanel={setShowFilterPanel}
        showFilterPanel={showFilterPanel}
        activeFilters={activeFilters}
        isSubmitting={isSubmitting}
        uploadingImages={uploadingImages}
      />
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

      {modalMode === "report" && selectedBin && (
        <div className="absolute top-[160px] right-[10px] z-[1000] bg-white p-3 rounded-md shadow-md border max-w-xs w-64">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800">Отчети за това кошче</h4>
            {isLoadingReports ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-xs text-gray-500">
                {getTotalReportsCount} общо
              </span>
            )}
          </div>

          {!isLoadingReports && binReports.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Неразрешени:</span>
                <span className="font-medium text-red-600">
                  {getUnresolvedReportsCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Разрешени:</span>
                <span className="font-medium text-green-600">
                  {getTotalReportsCount - getUnresolvedReportsCount}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Последни отчети:
                </p>
                <div className="space-y-1.5">
                  {binReports.slice(0, 3).map((report) => (
                    <div
                      key={report.id}
                      className={`p-2 rounded text-xs ${report.resolved ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium truncate">
                          {report.title}
                        </span>
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] ${report.resolved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {report.resolved ? "Разрешен" : "Активен"}
                        </span>
                      </div>
                      <p className="text-gray-600 truncate mt-1">
                        {report.description || "Без описание"}
                      </p>
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
            <p className="text-sm text-gray-500 text-center py-2">
              Все още няма отчети за това кошче
            </p>
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
          if (map) mapRef.current = map;
        }}
        markerZoomAnimation={true}
        fadeAnimation={true}
        zoomAnimation={true}
        inertia={true}
        wheelPxPerZoomLevel={120}
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

        {userLocation && (
          <Marker position={userLocation} icon={UserMarkerIcon} />
        )}

        {tempMarkerPosition && (
          <Marker position={tempMarkerPosition} icon={tempMarkerIcon}>
            <Popup className="dark:bg-neutral-800"></Popup>
          </Marker>
        )}

        <ViewportAwareMarkers
          filteredBins={filteredBins}
          zoom={zoom}
          onReport={handleReport}
          onEdit={handleEdit}
          isReportDisabled={isReportDisabled}
        />
      </MapContainer>
    </div>
  );
}
