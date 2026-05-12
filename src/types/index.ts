// ============================================
// BELREALTY - TYPES COMPLETS
// ============================================

// ─────────────────────────────────────────────
// COLLECTION: scraping_sites
// ─────────────────────────────────────────────
export type ScrapeStatus = "success" | "failed";

export interface ScrapingSite {
  $id: string;
  name: string;           // Nom du site (ex: "ImmoWeb")
  slug: string;            // ID technique unique (ex: "immoweb")
  base_url: string;       // URL du site
  is_active: boolean;      // Actif ou non (défaut: true)
  rate_limit_ms: number;  // Délai entre requêtes ms (défaut: 2000)
  properties_count: number; // Nb de propriétés scrapées
  last_scrape_at: string; // Date du dernier scrape
  last_scrape_status: ScrapeStatus | null; // "success" ou "failed"
  created_at: string;      // Date création
}

// ─────────────────────────────────────────────
// COLLECTION: scraping_jobs
// ─────────────────────────────────────────────
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobTrigger = "manual" | "scheduled" | "agent" | "realtime";

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
  site_id: string;        // Référence vers scraping_sites
  status: JobStatus;
  trigger: JobTrigger;
  filters: ScrapingJobFilters;
  stats: ScrapingJobStats;
  started_at: string;
  completed_at: string;
  error_message: string;
  created_by: string;      // "admin" ou "system" ou "hermes-agent"
}

// ─────────────────────────────────────────────
// COLLECTION: scraping_logs
// ─────────────────────────────────────────────
export type LogLevel = "INFO" | "WARNING" | "ERROR";

export interface ScrapingLog {
  $id: string;
  job_id: string;         // Référence vers scraping_jobs
  site_id: string;        // Référence vers scraping_sites
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>; // Données additionnelles
  created_at: string;
}

// ─────────────────────────────────────────────
// COLLECTION: properties
// ─────────────────────────────────────────────
export type PropertySource = "immoweb" | "immovlan" | "zimmo" | "era" | "immotop" | "othersite";
export type PropertyType = "apartment" | "house" | "villa" | "studio" | "commercial";
export type EnergyRating = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface PriceHistory {
  date: string;
  price: number;
}

export interface PropertyLocation {
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

export interface PropertyAgent {
  name: string;
  phone: string;
  agency: string;
}

export interface Property {
  $id: string;
  site_id: string;        // Référence vers scraping_sites (NOUVEAU)
  source_id: string;      // ID sur le site source (ex: "123456")
  url: string;
  title: string;
  description: string;
  price: number;
  surface_sqm: number;
  bedrooms: number;
  bathrooms: number;
  type: PropertyType;
  city: string;
  postal_code: string;
  province: string;
  latitude: number;
  longitude: number;
  address: string;
  photos: string[];
  agent_name: string;
  agent_phone: string;
  agent_agency: string;
  amenities: string[];
  energy_rating: EnergyRating;
  year_built: number;
  is_active: boolean;
  scraped_at: string;
  last_updated: string;
  // Champs legacy (compatibilité)
  source?: PropertySource;
  location?: PropertyLocation;
  specs?: PropertySpecs;
  agent?: PropertyAgent;
  price_history?: PriceHistory[];
}

// ─────────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────────
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
  site_id?: string;       // NOUVEAU: filtrer par site
}

// ─────────────────────────────────────────────
// ANALYTICS TYPES
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// USER TYPES
// ─────────────────────────────────────────────
export type UserRole = "admin" | "viewer";

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

// ─────────────────────────────────────────────
// HERMES API TYPES
// ─────────────────────────────────────────────
export interface HermesCommand {
  action: "list_properties" | "trigger_scrape" | "get_job_status" | "get_analytics";
  parameters?: Record<string, unknown>;
}

export interface HermesResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─────────────────────────────────────────────
// HELPER: Convert Property (legacy format) to new format
// ─────────────────────────────────────────────
export function adaptLegacyProperty(prop: Partial<Property>): Partial<Property> {
  if (!prop.location || !prop.specs || !prop.agent) {
    return prop;
  }

  return {
    ...prop,
    site_id: prop.source || "othersite",
    source_id: prop.$id || "",
    city: prop.location.city,
    postal_code: prop.location.postal_code,
    province: prop.location.province,
    latitude: prop.location.latitude,
    longitude: prop.location.longitude,
    address: prop.location.address,
    surface_sqm: prop.specs.surface_sqm,
    bedrooms: prop.specs.bedrooms,
    bathrooms: prop.specs.bathrooms,
    type: prop.specs.type,
    energy_rating: prop.specs.energy_rating,
    year_built: prop.specs.year_built || 0,
    amenities: prop.amenities || [],
    photos: prop.photos || [],
    agent_name: prop.agent.name,
    agent_phone: prop.agent.phone,
    agent_agency: prop.agent.agency,
  };
}