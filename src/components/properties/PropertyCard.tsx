import { Link } from "react-router-dom";
import {
  Bed,
  Bath,
  Square,
  MapPin,
  Calendar,
  ArrowDown,
  ArrowUp,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
  viewMode?: "grid" | "list";
}

const sourceColors = {
  immoweb: "bg-green-100 text-green-800",
  immovlan: "bg-blue-100 text-blue-800",
  zimmo: "bg-purple-100 text-purple-800",
  othersite: "bg-slate-100 text-slate-800",
};

const typeLabels = {
  apartment: "Apartment",
  house: "House",
  villa: "Villa",
  studio: "Studio",
  commercial: "Commercial",
};

const energyColors = {
  A: "bg-emerald-500",
  B: "bg-emerald-400",
  C: "bg-yellow-400",
  D: "bg-yellow-500",
  E: "bg-orange-500",
  F: "bg-orange-600",
  G: "bg-red-500",
};

export function PropertyCard({ property, viewMode = "grid" }: PropertyCardProps) {
  const priceChange = property.price_history.length > 1
    ? property.price_history[property.price_history.length - 1].price -
      property.price_history[property.price_history.length - 2].price
    : 0;

  const daysOnMarket = Math.floor(
    (Date.now() - new Date(property.scraped_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-BE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (viewMode === "list") {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <Link to={`/properties/${property.$id}`} className="flex">
          {/* Image */}
          <div className="relative w-48 h-32 flex-shrink-0">
            <img
              src={property.photos[0] || "/placeholder.svg"}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <Badge
              className={cn(
                "absolute top-2 left-2 text-xs",
                sourceColors[property.source]
              )}
            >
              {property.source}
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">
                    {property.title}
                  </h3>
                  <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.location.neighborhood}, {property.location.city}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {formatPrice(property.price)}
                  </div>
                  {priceChange !== 0 && (
                    <div
                      className={cn(
                        "flex items-center justify-end gap-0.5 text-sm",
                        priceChange < 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {priceChange < 0 ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                      {formatPrice(Math.abs(priceChange))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                {property.specs.bedrooms} beds
              </div>
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                {property.specs.bathrooms} baths
              </div>
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                {property.specs.surface_sqm} m²
              </div>
              <Badge
                variant="outline"
                className={cn("text-white border-0 ml-auto", energyColors[property.specs.energy_rating])}
              >
                {property.specs.energy_rating}
              </Badge>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <Link to={`/properties/${property.$id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.photos[0] || "/placeholder.svg"}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge className={cn("text-xs", sourceColors[property.source])}>
              {property.source}
            </Badge>
            {property.specs.type !== "apartment" && property.specs.type !== "studio" && (
              <Badge variant="secondary" className="text-xs">
                {typeLabels[property.specs.type]}
              </Badge>
            )}
          </div>

          {/* Price Change Indicator */}
          {priceChange !== 0 && (
            <div
              className={cn(
                "absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                priceChange < 0
                  ? "bg-emerald-500/90 text-white"
                  : "bg-red-500/90 text-white"
              )}
            >
              {priceChange < 0 ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )}
              {formatPrice(Math.abs(priceChange))}
            </div>
          )}

          {/* Energy Rating */}
          <div className="absolute bottom-3 right-3">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                energyColors[property.specs.energy_rating]
              )}
            >
              {property.specs.energy_rating}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Price */}
          <div className="text-xl font-bold text-blue-600 mb-1">
            {formatPrice(property.price)}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 line-clamp-1 mb-2">
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {property.location.neighborhood}, {property.location.city}
            </span>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 text-sm text-slate-600 pb-3 border-b">
            {property.specs.type !== "studio" && property.specs.type !== "commercial" && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                {property.specs.bedrooms}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.specs.bathrooms}
            </div>
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              {property.specs.surface_sqm} m²
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {daysOnMarket === 0 ? "Today" : `${daysOnMarket}d ago`}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-blue-600 hover:text-blue-700"
              onClick={(e) => {
                e.preventDefault();
                window.open(property.url, "_blank");
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Original
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  );
}
