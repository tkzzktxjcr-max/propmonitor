// Property Types
export type PropertySource = "immoweb" | "immovlan" | "zimmo" | "othersite";
export type PropertyType = "apartment" | "house" | "villa" | "studio" | "commercial";
export type EnergyRating = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobTrigger = "manual" | "scheduled" | "agent" | "realtime";
export type UserRole = "admin" | "viewer";

export interface PriceHistory {
  date: string;
  price: number;
}

export interface Location {
  address: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
}

export interface PropertySpecs {
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  surface_sqm: number;
  land_sqm: number;
  year_built: number;
  energy_rating: EnergyRating;
}

export interface Agent {
  name: string;
  phone: string;
  agency: string;
}

export interface Property {
  $id: string;
  source: PropertySource;
  source_id: string;
  url: string;
  title: string;
  description: string;
  price: number;
  price_history: PriceHistory[];
  location: Location;
  specs: PropertySpecs;
  amenities: string[];
  photos: string[];
  agent: Agent;
  scraped_at: string;
  last_updated: string;
  is_active: boolean;
}

export interface ScrapingJobStats {
  total_found: number;
  new_listings: number;
  updated: number;
  failed: number;
}

export interface ScrapingJobFilters {
  city?: string;
  province?: string;
  price_min?: number;
  price_max?: number;
  type?: PropertyType;
}

export interface ScrapingJob {
  $id: string;
  source: string;
  status: JobStatus;
  trigger: JobTrigger;
  filters: ScrapingJobFilters;
  stats: ScrapingJobStats;
  started_at: string;
  completed_at: string;
  error_message: string;
  created_by: string;
}

export interface User {
  $id: string;
  name: string;
  email: string;
  role: UserRole;
  preferences: {
    default_map_view: boolean;
    favorite_sources: PropertySource[];
  };
  created_at: string;
}

// Filter Types
export interface PropertyFilters {
  price_min?: number;
  price_max?: number;
  city?: string;
  province?: string;
  type?: PropertyType;
  bedrooms_min?: number;
  bedrooms_max?: number;
  surface_min?: number;
  surface_max?: number;
  energy_rating?: EnergyRating;
  sources?: PropertySource[];
  search?: string;
}

// Analytics Types
export interface MarketStats {
  total_listings: number;
  avg_price: number;
  median_price: number;
  price_change_7d: number;
  new_listings_today: number;
  new_listings_week: number;
}

export interface PriceDistribution {
  range: string;
  count: number;
}

export interface ProvinceStats {
  province: string;
  avg_price: number;
  listings_count: number;
}

export interface TrendData {
  date: string;
  avg_price: number;
  listings_count: number;
}

// Hermes API Types
export interface HermesCommand {
  action: "list_properties" | "trigger_scrape" | "get_job_status" | "get_analytics";
  parameters?: Record<string, unknown>;
}

export interface HermesResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
