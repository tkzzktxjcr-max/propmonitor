import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_PROPERTIES, Query, isDemoMode } from "@/lib/appwrite";
import { postalCodeToProvince, extractPostalCode } from "@/lib/utils";
import type { Property, PropertyFilters, PropertySource, PropertyType, EnergyRating } from "@/types";

// ─────────────────────────────────────────────
// MOCK DATA (Demo Mode)
// ─────────────────────────────────────────────
const mockProperties: Property[] = [
  {
    $id: "prop-1",
    site_id: "site-immoweb",
    source_id: "iw-12345",
    url: "https://www.immoweb.be/en/property/12345",
    title: "Modern Apartment with Brussels View",
    description: "Stunning modern apartment in Brussels.",
    price: 485000,
    surface_sqm: 95,
    bedrooms: 2,
    bathrooms: 1,
    type: "apartment",
    city: "Brussels",
    postal_code: "1050",
    province: "Brussels-Capital",
    latitude: 50.8503,
    longitude: 4.3517,
    address: "Avenue Louise 234, 1050 Brussels",
    photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
    agent_name: "Jean-Pierre Declercq",
    agent_phone: "+32 2 123 45 67",
    agent_agency: "Brussels Real Estate",
    amenities: ["Parking", "Elevator"],
    energy_rating: "A",
    year_built: 2018,
    is_active: true,
    scraped_at: "2024-03-20T10:30:00Z",
    last_updated: "2024-03-20T10:30:00Z",
    source: "immoweb",
    location: {
      address: "Avenue Louise 234, 1050 Brussels",
      city: "Brussels",
      province: "Brussels-Capital",
      postal_code: "1050",
      latitude: 50.8503,
      longitude: 4.3517,
      neighborhood: "Ixelles",
    },
    specs: {
      type: "apartment",
      bedrooms: 2,
      bathrooms: 1,
      surface_sqm: 95,
      land_sqm: 0,
      year_built: 2018,
      energy_rating: "A",
    },
    agent: {
      name: "Jean-Pierre Declercq",
      phone: "+32 2 123 45 67",
      agency: "Brussels Real Estate",
    },
    price_history: [{ date: "2024-01-15", price: 495000 }, { date: "2024-03-20", price: 485000 }],
  },
];

// ─────────────────────────────────────────────
// FETCH PROPERTIES WITH FILTERS
// ─────────────────────────────────────────────
export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      if (isDemoMode()) {
        return filterMockProperties(mockProperties, filters);
      }

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

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_PROPERTIES,
        queries
      );

      return response.documents.map((doc: any) => transformDocument(doc)) as Property[];
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
      if (isDemoMode()) {
        return mockProperties.find((p) => p.$id === id) || null;
      }

      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_PROPERTIES,
        id
      );

      return transformDocument(response) as Property;
    },
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────
// CREATE PROPERTY
// ─────────────────────────────────────────────
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (property: Omit<Property, "$id" | "scraped_at" | "last_updated">) => {
      if (isDemoMode()) {
        const newProp: Property = {
          ...property,
          $id: `prop-${Date.now()}`,
          scraped_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        };
        mockProperties.push(newProp);
        return newProp;
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_PROPERTIES,
        "unique()",
        {
          ...property,
          scraped_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        }
      );

      return transformDocument(response) as Property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// ─────────────────────────────────────────────
// HELPER: Filter mock properties
// ─────────────────────────────────────────────
function filterMockProperties(properties: Property[], filters?: PropertyFilters): Property[] {
  if (!filters) return properties;

  let filtered = [...properties];

  if (filters.price_min) filtered = filtered.filter((p) => p.price >= filters.price_min!);
  if (filters.price_max) filtered = filtered.filter((p) => p.price <= filters.price_max!);
  if (filters.city) filtered = filtered.filter((p) => p.city.toLowerCase().includes(filters.city!.toLowerCase()));
  if (filters.province) filtered = filtered.filter((p) => p.province === filters.province);
  if (filters.type) filtered = filtered.filter((p) => p.type === filters.type);
  if (filters.bedrooms_min !== undefined) filtered = filtered.filter((p) => p.bedrooms >= filters.bedrooms_min!);
  if (filters.bedrooms_max !== undefined) filtered = filtered.filter((p) => p.bedrooms <= filters.bedrooms_max!);
  if (filters.site_id) filtered = filtered.filter((p) => p.site_id === filters.site_id);
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.title.toLowerCase().includes(search) || p.city.toLowerCase().includes(search)
    );
  }

  return filtered;
}

// ─────────────────────────────────────────────
// HELPER: Transform Appwrite document to Property
// ─────────────────────────────────────────────
function transformDocument(doc: any): Property {
  const postalCode = extractPostalCode(doc.address || doc.city || "");

  return {
    $id: doc.$id,
    site_id: doc.site_id,
    source_id: doc.source_id,
    url: doc.url,
    title: doc.title,
    description: doc.description || "",
    price: doc.price,
    surface_sqm: doc.surface_sqm || 0,
    bedrooms: doc.bedrooms || 0,
    bathrooms: doc.bathrooms || 0,
    type: doc.type,
    city: doc.city,
    postal_code: postalCode,
    province: doc.province || postalCodeToProvince(postalCode),
    latitude: doc.latitude || 0,
    longitude: doc.longitude || 0,
    address: doc.address || "",
    photos: parseJSON(doc.photos, []),
    agent_name: doc.agent_name || "",
    agent_phone: doc.agent_phone || "",
    agent_agency: doc.agent_agency || "",
    amenities: [],
    energy_rating: "F",
    year_built: null,
    is_active: doc.is_active !== undefined ? doc.is_active : true,
    scraped_at: doc.scraped_at,
    last_updated: doc.last_updated,
    source: doc.source || getSourceFromSlug(doc.site_id),
    location: {
      address: doc.address || "",
      city: doc.city,
      province: doc.province || postalCodeToProvince(postalCode),
      postal_code: postalCode,
      latitude: doc.latitude || 0,
      longitude: doc.longitude || 0,
      neighborhood: doc.city,
    },
    specs: {
      type: doc.type,
      bedrooms: doc.bedrooms || 0,
      bathrooms: doc.bathrooms || 0,
      surface_sqm: doc.surface_sqm || 0,
      land_sqm: 0,
      year_built: null,
      energy_rating: "F",
    },
    agent: {
      name: doc.agent_name || "",
      phone: doc.agent_phone || "",
      agency: doc.agent_agency || "",
    },
    price_history: [{ date: doc.last_updated, price: doc.price }],
  };
}

function parseJSON(str: string | string[] | undefined, fallback: any): any {
  if (!str) return fallback;
  if (Array.isArray(str)) return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function getSourceFromSlug(siteId?: string): PropertySource {
  if (!siteId) return "othersite";
  if (siteId.includes("immoweb")) return "immoweb";
  if (siteId.includes("immovlan")) return "immovlan";
  if (siteId.includes("zimmo")) return "zimmo";
  return "othersite";
}