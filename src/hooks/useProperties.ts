import { useQuery } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_PROPERTIES, Query, logAppwriteError } from "@/lib/appwrite";
import { postalCodeToProvince, extractPostalCode } from "@/lib/utils";
import type { Property, PropertyFilters, PropertySource } from "@/types";

// ─────────────────────────────────────────────
// FETCH PROPERTIES WITH FILTERS
// ─────────────────────────────────────────────
export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      const queries: string[] = [
        Query.orderDesc("$createdAt"),
      ];

      if (filters?.city) {
        queries.push(Query.search("city", filters.city));
      }
      if (filters?.province) {
        queries.push(Query.equal("province", filters.province));
      }
      if (filters?.type) {
        queries.push(Query.equal("type", filters.type));
      }
      if (filters?.price_min) {
        queries.push(Query.greaterThanEqual("price", filters.price_min));
      }
      if (filters?.price_max) {
        queries.push(Query.lessThanEqual("price", filters.price_max));
      }
      if (filters?.bedrooms_min !== undefined) {
        queries.push(Query.greaterThanEqual("bedrooms", filters.bedrooms_min));
      }
      if (filters?.bedrooms_max !== undefined) {
        queries.push(Query.lessThanEqual("bedrooms", filters.bedrooms_max));
      }
      if (filters?.site_id) {
        queries.push(Query.equal("site_id", filters.site_id));
      }
      if (filters?.search) {
        queries.push(Query.or([
          Query.search("title", filters.search),
          Query.search("city", filters.search),
        ]));
      }

      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_PROPERTIES,
          queries
        );

        return response.documents.map((doc: unknown) => transformDocument(doc)) as Property[];
      } catch (error) {
        logAppwriteError("useProperties - listDocuments", error);
        throw error;
      }
    },
    staleTime: 30000,
  });
}

// ─────────────────────────────────────────────
// FETCH SINGLE PROPERTY
// ─────────────────────────────────────────────
export function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      try {
        const response = await databases.getDocument(
          DATABASE_ID,
          COLLECTION_PROPERTIES,
          id
        );

        return transformDocument(response) as Property;
      } catch (error) {
        logAppwriteError(`useProperty - getDocument(${id})`, error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────
// HELPER: Parse JSON string or array
// ─────────────────────────────────────────────
function parsePhotos(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─────────────────────────────────────────────
// HELPER: Transform Appwrite document to Property
// ─────────────────────────────────────────────
function transformDocument(doc: unknown): Property {
  const d = doc as Record<string, unknown>;
  const postalCode = extractPostalCode((d.address as string) || (d.city as string) || "");

  return {
    $id: d.$id as string,
    site_id: (d.site_id as string) || "",
    source_id: (d.source_id as string) || "",
    url: (d.url as string) || "",
    title: (d.title as string) || "",
    description: (d.description as string) || "",
    price: (d.price as number) || 0,
    surface_sqm: (d.surface_sqm as number) || 0,
    bedrooms: (d.bedrooms as number) || 0,
    bathrooms: (d.bathrooms as number) || 0,
    type: (d.type as Property["type"]) || "apartment",
    city: (d.city as string) || "",
    postal_code: postalCode,
    province: (d.province as string) || postalCodeToProvince(postalCode),
    latitude: (d.latitude as number) || 0,
    longitude: (d.longitude as number) || 0,
    address: (d.address as string) || "",
    photos: parsePhotos(d.photos),
    agent_name: (d.agent_name as string) || "",
    agent_phone: (d.agent_phone as string) || "",
    agent_agency: (d.agent_agency as string) || "",
    amenities: [],
    energy_rating: "F",
    year_built: null,
    is_active: d.is_active !== undefined ? (d.is_active as boolean) : true,
    scraped_at: (d.scraped_at as string) || "",
    last_updated: (d.last_updated as string) || "",
    source: (d.source as PropertySource) || getSourceFromSlug(d.site_id as string),
    location: {
      address: (d.address as string) || "",
      city: (d.city as string) || "",
      province: (d.province as string) || postalCodeToProvince(postalCode),
      postal_code: postalCode,
      latitude: (d.latitude as number) || 0,
      longitude: (d.longitude as number) || 0,
      neighborhood: (d.city as string) || "",
    },
    specs: {
      type: (d.type as Property["type"]) || "apartment",
      bedrooms: (d.bedrooms as number) || 0,
      bathrooms: (d.bathrooms as number) || 0,
      surface_sqm: (d.surface_sqm as number) || 0,
      land_sqm: 0,
      year_built: null,
      energy_rating: "F",
    },
    agent: {
      name: (d.agent_name as string) || "",
      phone: (d.agent_phone as string) || "",
      agency: (d.agent_agency as string) || "",
    },
    price_history: [{ date: (d.last_updated as string) || "", price: (d.price as number) || 0 }],
  };
}

function getSourceFromSlug(siteId?: string): PropertySource {
  if (!siteId) return "othersite";
  if (siteId.includes("immoweb")) return "immoweb";
  if (siteId.includes("immovlan")) return "immovlan";
  if (siteId.includes("zimmo")) return "zimmo";
  return "othersite";
}