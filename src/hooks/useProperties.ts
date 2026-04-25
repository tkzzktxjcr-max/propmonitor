import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_PROPERTIES, Query, isDemoMode } from "@/lib/appwrite";
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
    description: "Stunning modern apartment located in the heart of Brussels. Features floor-to-ceiling windows offering breathtaking views of the city. Recently renovated with high-end finishes throughout.",
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
    address: "Avenue Louise 234",
    photos: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    ],
    agent_name: "Jean-Pierre Declercq",
    agent_phone: "+32 2 123 45 67",
    agent_agency: "Brussels Real Estate",
    amenities: ["Parking", "Elevator", "Balcony", "Equipped Kitchen"],
    energy_rating: "A",
    year_built: 2018,
    is_active: true,
    scraped_at: "2024-03-20T10:30:00Z",
    last_updated: "2024-03-20T10:30:00Z",
    // Legacy fields for compatibility
    source: "immoweb",
    location: {
      address: "Avenue Louise 234",
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
    price_history: [
      { date: "2024-01-15", price: 495000 },
      { date: "2024-03-20", price: 485000 },
    ],
  },
  {
    $id: "prop-2",
    site_id: "site-immovlan",
    source_id: "iv-67890",
    url: "https://www.immovlan.be/en/property/67890",
    title: "Charming Townhouse in Ghent",
    description: "Beautiful townhouse in the historic center of Ghent. Features original architectural details combined with modern comfort. Private garden and garage included.",
    price: 675000,
    surface_sqm: 180,
    bedrooms: 4,
    bathrooms: 2,
    type: "house",
    city: "Ghent",
    postal_code: "9000",
    province: "East Flanders",
    latitude: 51.0543,
    longitude: 3.7174,
    address: "Vrijdagmarkt 15",
    photos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    ],
    agent_name: "Marie Verhoeven",
    agent_phone: "+32 9 234 56 78",
    agent_agency: "Gent Huizen",
    amenities: ["Garden", "Garage", "Fireplace", "Cellar"],
    energy_rating: "C",
    year_built: 1920,
    is_active: true,
    scraped_at: "2024-03-18T14:20:00Z",
    last_updated: "2024-03-18T14:20:00Z",
    source: "immovlan",
    location: {
      address: "Vrijdagmarkt 15",
      city: "Ghent",
      province: "East Flanders",
      postal_code: "9000",
      latitude: 51.0543,
      longitude: 3.7174,
      neighborhood: "Historic Center",
    },
    specs: {
      type: "house",
      bedrooms: 4,
      bathrooms: 2,
      surface_sqm: 180,
      land_sqm: 250,
      year_built: 1920,
      energy_rating: "C",
    },
    agent: {
      name: "Marie Verhoeven",
      phone: "+32 9 234 56 78",
      agency: "Gent Huizen",
    },
    price_history: [{ date: "2024-02-10", price: 675000 }],
  },
  {
    $id: "prop-3",
    site_id: "site-zimmo",
    source_id: "zm-11111",
    url: "https://www.zimmo.be/en/property/11111",
    title: "Luxury Villa near Antwerp",
    description: "Exceptional 5-bedroom villa with panoramic views. Features include indoor pool, home cinema, wine cellar, and 2 hectares of landscaped gardens.",
    price: 1850000,
    surface_sqm: 450,
    bedrooms: 5,
    bathrooms: 4,
    type: "villa",
    city: "Kontich",
    postal_code: "2550",
    province: "Antwerp",
    latitude: 51.1347,
    longitude: 4.4454,
    address: "Kasteelstraat 88",
    photos: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
    ],
    agent_name: "Peter Van Dyck",
    agent_phone: "+32 3 345 67 89",
    agent_agency: "Luxury Estates Belgium",
    amenities: ["Pool", "Home Cinema", "Wine Cellar", "Smart Home", "Security System"],
    energy_rating: "A",
    year_built: 2010,
    is_active: true,
    scraped_at: "2024-03-19T09:15:00Z",
    last_updated: "2024-03-19T09:15:00Z",
    source: "zimmo",
    location: {
      address: "Kasteelstraat 88",
      city: "Kontich",
      province: "Antwerp",
      postal_code: "2550",
      latitude: 51.1347,
      longitude: 4.4454,
      neighborhood: "Kasteel",
    },
    specs: {
      type: "villa",
      bedrooms: 5,
      bathrooms: 4,
      surface_sqm: 450,
      land_sqm: 20000,
      year_built: 2010,
      energy_rating: "A",
    },
    agent: {
      name: "Peter Van Dyck",
      phone: "+32 3 345 67 89",
      agency: "Luxury Estates Belgium",
    },
    price_history: [
      { date: "2024-01-05", price: 1950000 },
      { date: "2024-02-28", price: 1850000 },
    ],
  },
  {
    $id: "prop-4",
    site_id: "site-immoweb",
    source_id: "iw-22222",
    url: "https://www.immoweb.be/en/property/22222",
    title: "Cozy Studio in Leuven",
    description: "Perfect starter home or investment property. Fully furnished studio apartment near the university and city center.",
    price: 195000,
    surface_sqm: 35,
    bedrooms: 0,
    bathrooms: 1,
    type: "studio",
    city: "Leuven",
    postal_code: "3000",
    province: "Flemish Brabant",
    latitude: 50.8798,
    longitude: 4.7005,
    address: "Naamsestraat 50",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    ],
    agent_name: "Sofie Janssens",
    agent_phone: "+32 16 456 78 90",
    agent_agency: "Leuven Living",
    amenities: ["Furnished", "Bike Storage", "Laundry Room"],
    energy_rating: "D",
    year_built: 2005,
    is_active: true,
    scraped_at: "2024-03-17T16:45:00Z",
    last_updated: "2024-03-17T16:45:00Z",
    source: "immoweb",
    location: {
      address: "Naamsestraat 50",
      city: "Leuven",
      province: "Flemish Brabant",
      postal_code: "3000",
      latitude: 50.8798,
      longitude: 4.7005,
      neighborhood: "City Center",
    },
    specs: {
      type: "studio",
      bedrooms: 0,
      bathrooms: 1,
      surface_sqm: 35,
      land_sqm: 0,
      year_built: 2005,
      energy_rating: "D",
    },
    agent: {
      name: "Sofie Janssens",
      phone: "+32 16 456 78 90",
      agency: "Leuven Living",
    },
    price_history: [{ date: "2024-03-01", price: 195000 }],
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
        Query.equal("is_active", true),
        Query.orderDesc("$createdAt"),
      ];

      // Apply filters
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
          Query.search("description", filters.search),
          Query.search("city", filters.search),
        ]));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_PROPERTIES,
        queries
      );

      // Transform to Property format
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
        const prop = mockProperties.find((p) => p.$id === id);
        return prop || null;
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
// CREATE PROPERTY (for manual entry / testing)
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

  if (filters.price_min) {
    filtered = filtered.filter((p) => p.price >= filters.price_min!);
  }
  if (filters.price_max) {
    filtered = filtered.filter((p) => p.price <= filters.price_max!);
  }
  if (filters.city) {
    filtered = filtered.filter((p) =>
      p.city.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }
  if (filters.province) {
    filtered = filtered.filter((p) => p.province === filters.province);
  }
  if (filters.type) {
    filtered = filtered.filter((p) => p.type === filters.type);
  }
  if (filters.bedrooms_min !== undefined) {
    filtered = filtered.filter((p) => p.bedrooms >= filters.bedrooms_min!);
  }
  if (filters.bedrooms_max !== undefined) {
    filtered = filtered.filter((p) => p.bedrooms <= filters.bedrooms_max!);
  }
  if (filters.surface_min) {
    filtered = filtered.filter((p) => p.surface_sqm >= filters.surface_min!);
  }
  if (filters.surface_max) {
    filtered = filtered.filter((p) => p.surface_sqm <= filters.surface_max!);
  }
  if (filters.site_id) {
    filtered = filtered.filter((p) => p.site_id === filters.site_id);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.city.toLowerCase().includes(search)
    );
  }

  return filtered;
}

// ─────────────────────────────────────────────
// HELPER: Transform Appwrite document to Property
// ─────────────────────────────────────────────
function transformDocument(doc: any): Property {
  return {
    $id: doc.$id,
    site_id: doc.site_id,
    source_id: doc.source_id,
    url: doc.url,
    title: doc.title,
    description: doc.description,
    price: doc.price,
    surface_sqm: doc.surface_sqm,
    bedrooms: doc.bedrooms,
    bathrooms: doc.bathrooms,
    type: doc.type,
    city: doc.city,
    postal_code: doc.postal_code,
    province: doc.province,
    latitude: doc.latitude,
    longitude: doc.longitude,
    address: doc.address,
    photos: doc.photos || [],
    agent_name: doc.agent_name,
    agent_phone: doc.agent_phone,
    agent_agency: doc.agent_agency,
    amenities: doc.amenities || [],
    energy_rating: doc.energy_rating,
    year_built: doc.year_built,
    is_active: doc.is_active,
    scraped_at: doc.scraped_at,
    last_updated: doc.last_updated,
    // Legacy fields
    source: doc.source || getSourceFromSlug(doc.site_id),
    location: {
      address: doc.address,
      city: doc.city,
      province: doc.province,
      postal_code: doc.postal_code,
      latitude: doc.latitude,
      longitude: doc.longitude,
      neighborhood: doc.neighborhood || doc.city,
    },
    specs: {
      type: doc.type,
      bedrooms: doc.bedrooms,
      bathrooms: doc.bathrooms,
      surface_sqm: doc.surface_sqm,
      land_sqm: doc.land_sqm || 0,
      year_built: doc.year_built,
      energy_rating: doc.energy_rating,
    },
    agent: {
      name: doc.agent_name,
      phone: doc.agent_phone,
      agency: doc.agent_agency,
    },
    price_history: doc.price_history || [{ date: doc.last_updated, price: doc.price }],
  };
}

// ─────────────────────────────────────────────
// HELPER: Get source from site_id/slug
// ─────────────────────────────────────────────
function getSourceFromSlug(siteId?: string): PropertySource {
  if (!siteId) return "othersite";
  if (siteId.includes("immoweb")) return "immoweb";
  if (siteId.includes("immovlan")) return "immovlan";
  if (siteId.includes("zimmo")) return "zimmo";
  return "othersite";
}