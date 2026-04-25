import { useState } from "react";
import { Play, Bot, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PropertySource, PropertyType } from "@/types";

interface ScrapeTriggerProps {
  onTrigger: (params: {
    source: PropertySource;
    trigger: "manual" | "agent";
    filters?: {
      city?: string;
      price_min?: number;
      price_max?: number;
      type?: PropertyType;
    };
  }) => void;
  isLoading?: boolean;
}

const sources: { value: PropertySource; label: string; description: string }[] = [
  { value: "immoweb", label: "Immoweb", description: "Belgium's largest property platform" },
  { value: "immovlan", label: "Immovlan", description: "Comprehensive real estate listings" },
  { value: "zimmo", label: "Zimmo", description: "Modern property search platform" },
];

export function ScrapeTrigger({ onTrigger, isLoading }: ScrapeTriggerProps) {
  const [source, setSource] = useState<PropertySource>("immoweb");
  const [trigger, setTrigger] = useState<"manual" | "agent">("manual");
  const [city, setCity] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [allCities, setAllCities] = useState(true);

  const handleSubmit = () => {
    onTrigger({
      source,
      trigger,
      filters: allCities
        ? {}
        : {
            city: city || undefined,
            price_min: priceMin ? Number(priceMin) : undefined,
            price_max: priceMax ? Number(priceMax) : undefined,
            type: propertyType || undefined,
          },
    });

    // Reset form
    setCity("");
    setPriceMin("");
    setPriceMax("");
    setPropertyType("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-5 w-5 text-blue-600" />
          Trigger New Scrape
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Source Selection */}
        <div>
          <Label className="mb-3 block">Select Source</Label>
          <RadioGroup value={source} onValueChange={(v) => setSource(v as PropertySource)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sources.map((s) => (
                <div key={s.value}>
                  <RadioGroupItem value={s.value} id={s.value} className="peer sr-only" />
                  <Label
                    htmlFor={s.value}
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-slate-200 bg-white p-4 cursor-pointer hover:border-blue-300 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 transition-all"
                  >
                    <span className="font-semibold">{s.label}</span>
                    <span className="text-xs text-slate-500 mt-1">{s.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Trigger Type */}
        <div>
          <Label className="mb-3 block">Trigger Type</Label>
          <RadioGroup value={trigger} onValueChange={(v) => setTrigger(v as "manual" | "agent")}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer">
                  <Clock className="h-4 w-4" />
                  Manual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agent" id="agent" />
                <Label htmlFor="agent" className="flex items-center gap-2 cursor-pointer">
                  <Bot className="h-4 w-4" />
                  Hermes Agent
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-cities"
              checked={allCities}
              onCheckedChange={(checked) => setAllCities(checked as boolean)}
            />
            <Label htmlFor="all-cities" className="cursor-pointer">
              Scrape all cities
            </Label>
          </div>

          {!allCities && (
            <div className="pl-6 space-y-4 border-l-2 border-slate-200">
              <div>
                <Label htmlFor="city">City / Postal Code</Label>
                <Input
                  id="city"
                  placeholder="e.g., Brussels, 1000"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price-min">Min Price (€)</Label>
                  <Input
                    id="price-min"
                    type="number"
                    placeholder="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price-max">Max Price (€)</Label>
                  <Input
                    id="price-max"
                    type="number"
                    placeholder="No max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Property Type</Label>
                <Select
                  value={propertyType}
                  onValueChange={(v) => setPropertyType(v as PropertyType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Starting Scrape...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Scrape
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
