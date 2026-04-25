import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Square } from "lucide-react";
import type { Property } from "@/types";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const markerColors: Record<string, string> = {
  immoweb: "#22c55e",
  immovlan: "#3b82f6",
  zimmo: "#a855f7",
  othersite: "#64748b",
};

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export function PropertyMap({
  properties,
  center = [50.5039, 4.4699], // Belgium center
  zoom = 8,
}: PropertyMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-BE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Loading map...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController center={center} zoom={zoom} />

      {properties.map((property) => (
        <Marker
          key={property.$id}
          position={[property.location.latitude, property.location.longitude]}
          icon={createMarkerIcon(markerColors[property.source])}
        >
          <Popup>
            <div className="min-w-[200px]">
              <img
                src={property.photos[0] || "/placeholder.svg"}
                alt={property.title}
                className="w-full h-24 object-cover rounded mb-2"
              />
              <h3 className="font-semibold text-sm line-clamp-1">
                {property.title}
              </h3>
              <p className="text-blue-600 font-bold mt-1">
                {formatPrice(property.price)}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {property.location.city}, {property.location.neighborhood}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {property.specs.bedrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  {property.specs.bathrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Square className="h-3 w-3" />
                  {property.specs.surface_sqm}m²
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    property.source === "immoweb"
                      ? "bg-green-100 text-green-800"
                      : property.source === "immovlan"
                      ? "bg-blue-100 text-blue-800"
                      : property.source === "zimmo"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {property.source}
                </Badge>
                <Link
                  to={`/properties/${property.$id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Details →
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
