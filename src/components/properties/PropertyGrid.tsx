import { useState } from "react";
import { PropertyCard } from "./PropertyCard";
import { PropertyMap } from "./PropertyMap";
import { PropertyFilters } from "./PropertyFilters";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import {
  Grid3X3,
  List,
  Map,
  SlidersHorizontal,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Property, PropertyFilters as Filters } from "@/types";

interface PropertyGridProps {
  properties: Property[];
  filters?: Filters;
  onFiltersChange?: (filters: Filters) => void;
  isLoading?: boolean;
}

export function PropertyGrid({
  properties,
  filters,
  onFiltersChange,
  isLoading,
}: PropertyGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No properties found
        </h3>
        <p className="text-slate-500 max-w-sm">
          Try adjusting your filters or search criteria to find more properties.
        </p>
        {onFiltersChange && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => onFiltersChange({})}
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{properties.length}</span>{" "}
          properties found
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Filters */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <PropertyFilters
                filters={filters}
                onFiltersChange={onFiltersChange}
                onClose={() => setShowFilters(false)}
              />
            </SheetContent>
          </Sheet>

          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as typeof viewMode)}
            className="border rounded-lg"
          >
            <ToggleGroupItem value="grid" className="px-3">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="px-3">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="map" className="px-3">
              <Map className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Content */}
      {viewMode === "map" ? (
        <div className="h-[600px] rounded-xl overflow-hidden border">
          <PropertyMap properties={properties} />
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {properties.map((property) => (
            <PropertyCard
              key={property.$id}
              property={property}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
