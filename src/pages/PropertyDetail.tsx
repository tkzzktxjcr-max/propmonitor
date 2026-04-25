import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Fuel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Header } from "@/components/layout/Header";
import { useProperty } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";
import type { EnergyRating } from "@/types";

const energyColors: Record<EnergyRating, string> = {
  A: "bg-emerald-500",
  B: "bg-emerald-400",
  C: "bg-yellow-400",
  D: "bg-yellow-500",
  E: "bg-orange-500",
  F: "bg-orange-600",
  G: "bg-red-500",
};

const sourceLabels = {
  immoweb: "Immoweb",
  immovlan: "Immovlan",
  zimmo: "Zimmo",
  othersite: "Other",
};

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id || "");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-BE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-slate-200 rounded" />
            <div className="aspect-[2/1] bg-slate-200 rounded-xl" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-10 w-3/4 bg-slate-200 rounded" />
                <div className="h-6 w-1/2 bg-slate-200 rounded" />
                <div className="h-32 bg-slate-200 rounded" />
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-slate-200 rounded" />
                <div className="h-48 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h1>
          <p className="text-slate-500 mb-6">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/">Back to Properties</Link>
          </Button>
        </main>
      </div>
    );
  }

  const priceHistoryData = property.price_history.map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: p.price,
  }));

  const priceChange = property.price_history.length > 1
    ? property.price_history[property.price_history.length - 1].price -
      property.price_history[0].price
    : 0;

  const daysOnMarket = Math.floor(
    (Date.now() - new Date(property.scraped_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Properties
        </Link>

        {/* Photo Gallery */}
        <div className="mb-8">
          <Carousel className="w-full">
            <CarouselContent>
              {property.photos.map((photo, index) => (
                <CarouselItem key={index}>
                  <div className="relative">
                    <AspectRatio ratio={2 / 1}>
                      <img
                        src={photo}
                        alt={`${property.title} - Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </AspectRatio>
                    <Badge className="absolute top-4 left-4">
                      {index + 1} / {property.photos.length}
                    </Badge>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary">{sourceLabels[property.source]}</Badge>
                <Badge variant="outline" className="capitalize">
                  {property.specs.type}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-slate-500 ml-auto">
                  <Clock className="h-4 w-4" />
                  Listed {daysOnMarket} days ago
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-5 w-5" />
                <span>
                  {property.location.address}, {property.location.city} ({property.location.postal_code})
                </span>
              </div>
            </div>

            {/* Price & Key Specs */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Price</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatPrice(property.price)}
                    </p>
                    {priceChange !== 0 && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-sm mt-1",
                          priceChange < 0 ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {priceChange < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                        {formatPrice(Math.abs(priceChange))} from initial
                      </div>
                    )}
                  </div>
                  
                  <Separator orientation="vertical" className="h-16" />
                  
                  <div className="flex gap-6">
                    {property.specs.type !== "studio" && property.specs.type !== "commercial" && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Bedrooms</p>
                        <div className="flex items-center gap-2">
                          <Bed className="h-5 w-5 text-slate-400" />
                          <span className="text-xl font-semibold">{property.specs.bedrooms}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Bathrooms</p>
                      <div className="flex items-center gap-2">
                        <Bath className="h-5 w-5 text-slate-400" />
                        <span className="text-xl font-semibold">{property.specs.bathrooms}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Surface</p>
                      <div className="flex items-center gap-2">
                        <Square className="h-5 w-5 text-slate-400" />
                        <span className="text-xl font-semibold">{property.specs.surface_sqm} m²</span>
                      </div>
                    </div>
                  </div>

                  <Separator orientation="vertical" className="h-16" />

                  <div>
                    <p className="text-sm text-slate-500 mb-1">Energy Rating</p>
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                        energyColors[property.specs.energy_rating]
                      )}
                    >
                      {property.specs.energy_rating}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 leading-relaxed">
                  {property.description}
                </p>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Property Type</p>
                    <p className="font-medium capitalize">{property.specs.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Year Built</p>
                    <p className="font-medium">{property.specs.year_built || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Land Size</p>
                    <p className="font-medium">
                      {property.specs.land_sqm > 0 ? `${property.specs.land_sqm} m²` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Province</p>
                    <p className="font-medium">{property.location.province}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Neighborhood</p>
                    <p className="font-medium">{property.location.neighborhood}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Source</p>
                    <p className="font-medium">{sourceLabels[property.source]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="px-3 py-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price History */}
            {property.price_history.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Price History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceHistoryData}>
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatPrice(value), "Price"]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Agent */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {property.agent.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{property.agent.name}</p>
                    <p className="text-sm text-slate-500">{property.agent.agency}</p>
                  </div>
                </div>
                
                <Separator />
                
                <Button className="w-full" size="lg">
                  <Phone className="h-4 w-4 mr-2" />
                  {property.agent.phone}
                </Button>
                
                <Button variant="outline" className="w-full" size="lg">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  asChild
                >
                  <a href={property.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on {sourceLabels[property.source]}
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Facts */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Fuel className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-600">
                      Energy Class: <span className="font-semibold">{property.specs.energy_rating}</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-600">
                      Listed: <span className="font-semibold">{daysOnMarket} days ago</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-600">
                      Source ID: <span className="font-mono text-sm">{property.source_id}</span>
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      property.location.longitude - 0.01
                    },${property.location.latitude - 0.01},${
                      property.location.longitude + 0.01
                    },${property.location.latitude + 0.01}&layer=mapnik&marker=${
                      property.location.latitude
                    },${property.location.longitude}`}
                    className="w-full h-full border-0"
                    title="Property Location"
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2 text-center">
                  {property.location.address}, {property.location.city}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
