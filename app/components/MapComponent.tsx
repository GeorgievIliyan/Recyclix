"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo } from "react";
import { renderToString } from "react-dom/server";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Recycle, Home } from "lucide-react";

// интерфейс за типизация
export interface Bin {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, any>;
  osm_type: "node" | "way" | "relation";
}
// интерфейс за типизация на картата
interface MapProps {
  bins: Bin[];
}
// функция за връщане на иконка за рециклиране
const RecyclingIconContent = () => (
  <div className="relative w-8 h-8 bg-green-500 rounded-full rotate-45 shadow-lg group hover:scale-110 transition-transform duration-200">
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 text-white">
      <Recycle className="w-5 h-5" strokeWidth={2.5} />
    </div>
  </div>
);
// функция за връщане на иконка за боклук
const TrashIconContent = () => (
  <div className="relative w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center group hover:scale-110 transition-transform duration-200">
    <Trash2 className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-200" />
  </div>
);
// главна функция
export default function MapComponent({ bins }: MapProps) {
  // ключове, стойности и други
  const mapRef = useRef<L.Map | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const jawgApiKey = process.env.NEXT_PUBLIC_JAWG_KEY;
  // начални стойности
  const DEFAULT_CENTER: [number, number] = [43.2141, 27.9147];
  const DEFAULT_ZOOM = 13;
  // монтиране на ефект
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMounted]);
  // слагане на иконка
  const recyclingIcon = useMemo(() => {
    return L.divIcon({
      html: renderToString(<RecyclingIconContent />),
      className: "custom-recycling-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }, []);
  // слагане на иконка
  const trashIcon = useMemo(() => {
    return L.divIcon({
      html: renderToString(<TrashIconContent />),
      className: "custom-trash-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }, []);
  // за zoom-ване в картата
  const handleZoomHome = () => {
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
    }
  };
  // при зареждане
  if (!isMounted) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-gray-100">
        Картата се зарежда...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <button
        onClick={handleZoomHome}
        className="absolute top-[80px] left-[10px] z-[1000] bg-white p-2 rounded-md shadow-md border border-gray-300 hover:bg-gray-100 transition-colors"
        title="Reset View"
      >
        <Home className="w-5 h-5 text-gray-700" />
      </button>
      {/* Контайнер */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={4}
        maxZoom={22}
        className="h-full w-full"
        ref={(map) => {
          if (map) mapRef.current = map;
        }}
      >
        <TileLayer
          url={
            jawgApiKey
              ? `https://tile.jawg.io/jawg-streets/{z}/{x}/{y}.png?access-token=${jawgApiKey}`
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution={
            jawgApiKey
              ? '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          minZoom={4}
          maxZoom={22}
          maxNativeZoom={18}
        />

        {bins.map((bin) => {
          const isTrashBin = bin.tags?.amenity === "waste_basket";
          const icon = isTrashBin ? trashIcon : recyclingIcon;

          if (bin.lat == null || bin.lon == null) return null;

          return (
            <Marker 
              position={[bin.lat, bin.lon]} 
              icon={icon} 
              key={bin.id}
            >
              <Popup className="custom-popup" key={bin.id}>
                <div className="p-2 min-w-[150px]">
                  <h3 className="font-bold text-green-700 mb-2">
                    {isTrashBin ? "Trash Bin" : "Recycling Point"}
                  </h3>
                  {bin.tags?.name && (
                    <p className="text-sm font-medium mb-1">{bin.tags.name}</p>
                  )}
                  {bin.tags?.recycling_type && (
                    <p className="text-xs text-gray-600">
                      Type: {bin.tags.recycling_type}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-gray-400 border-t pt-2">
                    <p>Lat: {bin.lat.toFixed(6)}</p>
                    <p>Lng: {bin.lon.toFixed(6)}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}