import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, COLLECTION_PROPERTIES, DATABASE_ID, Query } from "@/lib/appwrite";
import type { Property, PropertyFilters } from "@/types";

// Mock data for demo purposes when Appwrite is not configured
const mockProperties: Property[] = [
  {
    $id: "1",
    source: "immoweb",
    source_id: "iw-12345",
    url: "https://www.immoweb.be/en/property/12345",
    title: "Modern Apartment with Brussels View",
    description: "Stunning modern apartment located in the heart of Brussels. Features floor-to-ceiling windows offering breathtaking views of the city. Recently renovated with high-end finishes throughout.",
    price: 485000,
    price_history: [
      { date: "2024-01-15", price: 495000 },
      { date: "2024-03-20", price: 485000 }
    ],
    location: {
      address: "Avenue Louise 234",
      city: "Brussels",
      province: "Brussels-Capital",
      postal_code: "1050",
      latitude: 50.8503,
      longitude: 4.3517,
      neighborhood: "Ixelles"
    },
    specs: {
      type: "apartment",
      bedrooms: 2,
      bathrooms: 1,
      surface_sqm: 95,
      land_sqm: 0,
      year_built: 2018,
      energy_rating: "A"
    },
    amenities: ["Parking", "Elevator", "Balcony", "Equipped Kitchen"],
    photos: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"
    ],
    agent: {
      name: "Jean-Pierre Declercq",
      phone: "+32 2 123 45 67",
      agency: "Brussels Real Estate"
    },
    scraped_at: "2024-03-20T10:30:00Z",
    last_updated: "2024-03-20T10:30:00Z",
    is_active: true
  },
  {
    $id: "2",
    source: "immovlan",
    source_id: "iv-67890",
    url: "https://www.immovlan.be/en/property/67890",
    title: "Charming Townhouse in Ghent",
    description: "Beautiful townhouse in the historic center of Ghent. Features original architectural details combined with modern comfort. Private garden and garage included.",
    price: 675000,
    price_history: [
      { date: "2024-02-10", price: 675000 }
    ],
    location: {
      address: "Vrijdagmarkt 15",
      city: "Ghent",
      province: "East Flanders",
      postal_code: "9000",
      latitude: 51.0543,
      longitude: 3.7174,
      neighborhood: "Historic Center"
    },
    specs: {
      type: "house",
      bedrooms: 4,
      bathrooms: 2,
      surface_sqm: 180,
      land_sqm: 250,
      year_built: 1920,
      energy_rating: "C"
    },
    amenities: ["Garden", "Garage", "Fireplace", "Cellar"],
    photos: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
    ],
    agent: {
      name: "Marie Verhoeven",
      phone: "+32 9 234 56 78",
      agency: "Gent Huizen"
    },
    scraped_at: "2024-03-18T14:20:00Z",
    last_updated: "2024-03-18T14:20:00Z",
    is_active: true
  },
  {
    $id: "3",
    source: "zimmo",
    source_id: "zm-11111",
    url: "https://www.zimmo.be/en/property/11111",
    title: "Luxury Villa near Antwerp",
    description: "Exceptional 5-bedroom villa with panoramic views. Features include indoor pool, home cinema, wine cellar, and 2 hectares of landscaped gardens.",
    price: 1850000,
    price_history: [
      { date: "2024-01-05", price: 1950000 },
      { date: "2024-02-28", price: 1850000 }
    ],
    location: {
      address: "Kasteelstraat 88",
      city: "Kontich",
      province: "Antwerp",
      postal_code: "2550",
      latitude: 51.1347,
      longitude: 4.4454,
      neighborhood: "Kasteel"
    },
    specs: {
      type: "villa",
      bedrooms: 5,
      bathrooms: 4,
      surface_sqm: 450,
      land_sqm: 20000,
      year_built: 2010,
      energy_rating: "A"
    },
    amenities: ["Pool", "Home Cinema", "Wine Cellar", "Smart Home", "Security System"],
    photos: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
    ],
    agent: {
      name: "Peter Van Dyck",
      phone: "+32 3 345 67 89",
      agency: "Luxury Estates Belgium"
    },
    scraped_at: "2024-03-19T09:15:00Z",
    last_updated: "2024-03-19T09:15:00Z",
    is_active: true
  },
  {
    $id: "4",
    source: "immoweb",
    source_id: "iw-22222",
    url: "https://www.immoweb.be/en/property/22222",
    title: "Cozy Studio in Leuven",
    description: "Perfect starter home or investment property. Fully furnished studio apartment near the university and city center.",
    price: 195000,
    price_history: [
      { date: "2024-03-01", price: 195000 }
    ],
    location: {
      address: "Naamsestraat 50",
      city: "Leuven",
      province: "Flemish Brabant",
      postal_code: "3000",
      latitude: 50.8798,
      longitude: 4.7005,
      neighborhood: "City Center"
    },
    specs: {
      type: "studio",
      bedrooms: 0,
      bathrooms: 1,
      surface_sqm: 35,
      land_sqm: 0,
      year_built: 2005,
      energy_rating: "D"
    },
    amenities: ["Furnished", "Bike Storage", "Laundry Room"],
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ],
    agent: {
      name: "Sofie Janssens",
      phone: "+32 16 456 78 90",
      agency: "Leuven Living"
    },
    scraped_at: "2024-03-17T16:45:00Z",
    last_updated: "2024-03-17T16:45:00Z",
    is_active: true
  },
  {
    $id: "5",
    source: "immovlan",
    source_id: "iv-33333",
    url: "https://www.immovlan.be/en/property/33333",
    title: "Commercial Space in Bruges Center",
    description: "Prime retail location in the main shopping street of Bruges. High foot traffic, large storefront windows, basement storage.",
    price: 890000,
    price_history: [
      { date: "2024-02-15", price: 890000 }
    ],
    location: {
      address: "Steenstraat 120",
      city: "Bruges",
      province: "West Flanders",
      postal_code: "8000",
      latitude: 51.2093,
      longitude: 3.2247,
      neighborhood: "Shopping District"
    },
    specs: {
      type: "commercial",
      bedrooms: 0,
      bathrooms: 2,
      surface_sqm: 220,
      land_sqm: 0,
      year_built: 1900,
      energy_rating: "E"
    },
    amenities: ["Storage", "Kitchen", "Toilets", "Loading Dock"],
    photos: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"
    ],
    agent: {
      name: "Thomas Maertens",
      phone: "+32 50 567 89 01",
      agency: "Bruges Commercial"
    },
    scraped_at: "2024-03-16T11:30:00Z",
    last_updated: "2024-03-16T11:30:00Z",
    is_active: true
  },
  {
    $id: "6",
    source: "zimmo",
    source_id: "zm-44444",
    url: "https://www.zimmo.be/en/property/44444",
    title: "Family House with Pool in Waterloo",
    description: "Beautiful family home in a quiet residential area. Features a heated pool, large living spaces, and a beautifully landscaped garden.",
    price: 925000,
    price_history: [
      { date: "2024-01-20", price: 950000 },
      { date: "2024-03-15", price: 925000 }
    ],
    location: {
      address: "Avenue des Tilleuls 45",
      city: "Waterloo",
      province: "Walloon Brabant",
      postal_code: "1410",
      latitude: 50.6804,
      longitude: 4.3988,
      neighborhood: "Château"
    },
    specs: {
      type: "house",
      bedrooms: 5,
      bathrooms: 3,
      surface_sqm: 320,
      land_sqm: 1500,
      year_built: 1995,
      energy_rating: "B"
    },
    amenities: ["Pool", "Garden", "Double Garage", "Alarm System"],
    photos: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800"
    ],
    agent: {
      name: "Claire Dubois",
      phone: "+32 2 789 01 23",
      agency: "Waterloo Properties"
    },
    scraped_at: "2024-03-15T08:00:00Z",
    last_updated: "2024-03-15T08:00:00Z",
    is_active: true
  }
];

export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      // In production, this would call Appwrite
      // For demo, return mock data with filtering
      let filtered = [...mockProperties];
      
      if (filters) {
        if (filters.price_min) {
          filtered = filtered.filter(p => p.price >= filters.price_min!);
        }
        if (filters.price_max) {
          filtered = filtered.filter(p => p.price <= filters.price_max!);
        }
        if (filters.city) {
          filtered = filtered.filter(p => 
            p.location.city.toLowerCase().includes(filters.city!.toLowerCase())
          );
        }
        if (filters.province) {
          filtered = filtered.filter(p => 
            p.location.province === filters.province
          );
        }
        if (filters.type) {
          filtered = filtered.filter(p => p.specs.type === filters.type);
        }
        if (filters.bedrooms_min !== undefined) {
          filtered = filtered.filter(p => p.specs.bedrooms >= filters.bedrooms_min!);
        }
        if (filters.bedrooms_max !== undefined) {
          filtered = filtered.filter(p => p.specs.bedrooms <= filters.bedrooms_max!);
        }
        if (filters.surface_min) {
          filtered = filtered.filter(p => p.specs.surface_sqm >= filters.surface_min!);
        }
        if (filters.surface_max) {
          filtered = filtered.filter(p => p.specs.surface_sqm <= filters.surface_max!);
        }
        if (filters.sources && filters.sources.length > 0) {
          filtered = filtered.filter(p => filters.sources!.includes(p.source));
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search) ||
            p.location.city.toLowerCase().includes(search) ||
            p.location.neighborhood.toLowerCase().includes(search)
          );
        }
      }
      
      return filtered;
    },
    staleTime: 30000,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      // In production, this would call Appwrite
      return mockProperties.find(p => p.$id === id) || null;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (property: Omit<Property, "$id">) => {
      // In production, this would create in Appwrite
      console.log("Creating property:", property);
      return { $id: Date.now().toString(), ...property };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
