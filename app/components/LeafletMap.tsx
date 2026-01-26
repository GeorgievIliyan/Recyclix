"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import { renderToString } from "react-dom/server"
import { Trash2 } from "lucide-react"

type LeafletMapProps = {
  lat: number
  lon: number
  zoom?: number
  height?: number
}

// динамично импортиране на компонентите, за да се избегнат грешки при сървърно рендиране (ssr)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })

export default function LeafletMap({ lat, lon, zoom = 16, height = 400 }: LeafletMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [customIcon, setCustomIcon] = useState<L.Icon | L.DivIcon | null>(null)
  const [mapTheme, setMapTheme] = useState("streets")

  useEffect(() => {
    // отбелязваме, че компонентът е зареден в браузъра
    setIsMounted(true)

    // импортираме leaflet библиотеката само на клиента
    import("leaflet").then((L) => {
      // коригиране на пътищата към стандартните икони на leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      })

      // създаване на персонализирана икона чрез div и lucide икона
      const icon = L.divIcon({
        className: "",
        html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, #34d399, #10b981);box-shadow: 0 2px 6px rgba(0,0,0,0.3);color:white;">
          ${renderToString(<Trash2 size={20} color="white" />)}
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })
      setCustomIcon(icon)
    })

    // проверка за предпочитана тъмна тема на системно ниво
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setMapTheme(isDark ? "dark" : "streets")
  }, [])

  // показване на скелет (placeholder) докато картата се инициализира
  if (!isMounted || !customIcon) {
    return (
      <div style={{ height }} className="w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
        <span className="text-gray-400 animate-pulse">зареждане на картата... // bg lowercase</span>
      </div>
    )
  }

  return (
    <MapContainer center={[lat, lon]} zoom={zoom} style={{ height, width: "100%" }}>
      {/* използване на jawg maps слоеве с динамична тема */}
      <TileLayer
        url={`https://tile.jawg.io/jawg-${mapTheme}/{z}/{x}/{y}.png?access-token=${process.env.NEXT_PUBLIC_JAWG_KEY}`}
        attribution="© jawg © openstreetmap"
      />
      {/* поставяне на маркер на зададените координати */}
      <Marker position={[lat, lon]} icon={customIcon} />
    </MapContainer>
  )
}