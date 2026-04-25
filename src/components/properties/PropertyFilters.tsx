import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PropertyFilters as Filters, PropertySource, PropertyType } from "@/types";

interface PropertyFiltersProps {
  filters?: Filters;
  onFiltersChange?: (filters: Filters) => void;
  onClose?: () => void;
}

const provinces = [
  "Brussels-Capital",
  "Flemish Brabant",
  "Walloon Brabant",
  "Antwerp",
  "East Flanders",
  "West Flanders",
  "Liège",
  "Hainaut",
  "Namur",
  "Luxembourg",
];

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "commercial", label: "Commercial" },
];

const sources: { value: PropertySource; label: string }[] = [
  { value: "immoweb", label: "Immoweb" },
  { value: "immovlan", label: "Immovlan" },
  { value: "zimmo", label: "Zimmo" },
];

const energyRatings = ["A", "B", "C", "D", "E", "F", "G"];

export function PropertyFilters({
  filters = {},
  onFiltersChange,
  onClose,
}: PropertyFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const toggleArrayFilter = <K extends "sources">(key: K, value: Filters[K][number]) => {
    const current = localFilters[key] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, updated.length > 0 ? updated : undefined);
  };

  const clearFilters = () => {
    setLocalFilters({});
    onFiltersChange?.({});
  };

  const activeFiltersCount = Object.values(localFilters).filter(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Filters</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-500"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Accordion type="multiple" defaultValue={["price", "location", "type"]}>
          {/* Price Range */}
          <AccordionItem value="price">
            <AccordionTrigger>Price Range</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-sm text-slate-500">Min Price</Label>
                    <Input
                      type="number"
                      placeholder="€0"
                      value={localFilters.price_min || ""}
                      onChange={(e) =>
                        updateFilter(
                          "price_min",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm text-slate-500">Max Price</Label>
                    <Input
                      type="number"
                      placeholder="No max"
                      value={localFilters.price_max || ""}
                      onChange={(e) =>
                        updateFilter(
                          "price_max",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location">
            <AccordionTrigger>Location</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-500 mb-2 block">
                    City / Postal Code
                  </Label>
                  <Input
                    placeholder="e.g., Brussels, 1000"
                    value={localFilters.city || ""}
                    onChange={(e) =>
                      updateFilter(
                        "city",
                        e.target.value || undefined
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm text-slate-500 mb-2 block">
                    Province
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {provinces.map((province) => (
                      <Button
                        key={province}
                        variant={
                          localFilters.province === province
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className="justify-start text-left truncate"
                        onClick={() =>
                          updateFilter(
                            "province",
                            localFilters.province === province
                              ? undefined
                              : province
                          )
                        }
                      >
                        {province}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Property Type */}
          <AccordionItem value="type">
            <AccordionTrigger>Property Type</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                {propertyTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={
                      localFilters.type === type.value
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateFilter(
                        "type",
                        localFilters.type === type.value
                          ? undefined
                          : type.value
                      )
                    }
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Bedrooms */}
          <AccordionItem value="bedrooms">
            <AccordionTrigger>Bedrooms</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <Slider
                  value={[
                    localFilters.bedrooms_min || 0,
                    localFilters.bedrooms_max || 10,
                  ]}
                  onValueChange={([min, max]) => {
                    updateFilter(
                      "bedrooms_min",
                      min > 0 ? min : undefined
                    );
                    updateFilter(
                      "bedrooms_max",
                      max < 10 ? max : undefined
                    );
                  }}
                  min={0}
                  max={10}
                  step={1}
                />
                <div className="flex justify-between text-sm text-slate-500">
                  <span>
                    {localFilters.bedrooms_min || 0}+ beds
                  </span>
                  <span>
                    Up to {localFilters.bedrooms_max || 10} beds
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Surface */}
          <AccordionItem value="surface">
            <AccordionTrigger>Surface Area</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-sm text-slate-500">Min (m²)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={localFilters.surface_min || ""}
                      onChange={(e) =>
                        updateFilter(
                          "surface_min",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm text-slate-500">Max (m²)</Label>
                    <Input
                      type="number"
                      placeholder="No max"
                      value={localFilters.surface_max || ""}
                      onChange={(e) =>
                        updateFilter(
                          "surface_max",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Energy Rating */}
          <AccordionItem value="energy">
            <AccordionTrigger>Energy Rating</AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                {energyRatings.map((rating) => (
                  <Button
                    key={rating}
                    variant={
                      localFilters.energy_rating === rating
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className={
                      localFilters.energy_rating === rating
                        ? ""
                        : "border-2"
                    }
                    style={{
                      borderColor:
                        localFilters.energy_rating === rating
                          ? undefined
                          : rating === "A" || rating === "B"
                          ? "#10b981"
                          : rating === "C" || rating === "D"
                          ? "#eab308"
                          : "#ef4444",
                    }}
                    onClick={() =>
                      updateFilter(
                        "energy_rating",
                        localFilters.energy_rating === rating
                          ? undefined
                          : rating as Filters["energy_rating"]
                      )
                    }
                  >
                    {rating}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sources */}
          <AccordionItem value="sources">
            <AccordionTrigger>Sources</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.value} className="flex items-center gap-3">
                    <Checkbox
                      id={source.value}
                      checked={localFilters.sources?.includes(source.value)}
                      onCheckedChange={() =>
                        toggleArrayFilter("sources", source.value)
                      }
                    />
                    <Label
                      htmlFor={source.value}
                      className="font-normal cursor-pointer"
                    >
                      {source.label}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button
          className="w-full"
          onClick={() => {
            onFiltersChange?.(localFilters);
            onClose?.();
          }}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
