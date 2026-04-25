import { useQuery } from "@tanstack/react-query";
import type { MarketStats, PriceDistribution, ProvinceStats, TrendData } from "@/types";

// Mock analytics data
const mockMarketStats: MarketStats = {
  total_listings: 1247,
  avg_price: 425000,
  median_price: 375000,
  price_change_7d: -2.3,
  new_listings_today: 23,
  new_listings_week: 156
};

const mockPriceDistribution: PriceDistribution[] = [
  { range: "€0-200k", count: 245 },
  { range: "€200-400k", count: 412 },
  { range: "€400-600k", count: 298 },
  { range: "€600-800k", count: 156 },
  { range: "€800k-1M", count: 78 },
  { range: "€1M+", count: 58 }
];

const mockProvinceStats: ProvinceStats[] = [
  { province: "Brussels-Capital", avg_price: 485000, listings_count: 312 },
  { province: "Flemish Brabant", avg_price: 452000, listings_count: 189 },
  { province: "Walloon Brabant", avg_price: 525000, listings_count: 98 },
  { province: "Antwerp", avg_price: 398000, listings_count: 234 },
  { province: "East Flanders", avg_price: 345000, listings_count: 167 },
  { province: "West Flanders", avg_price: 312000, listings_count: 145 },
  { province: "Liège", avg_price: 275000, listings_count: 102 },
  { province: "Hainaut", avg_price: 245000, listings_count: 89 },
  { province: "Namur", avg_price: 289000, listings_count: 67 },
  { province: "Luxembourg", avg_price: 325000, listings_count: 45 }
];

const mockTrendData: TrendData[] = [
  { date: "2024-02-01", avg_price: 432000, listings_count: 1180 },
  { date: "2024-02-08", avg_price: 428000, listings_count: 1195 },
  { date: "2024-02-15", avg_price: 425000, listings_count: 1210 },
  { date: "2024-02-22", avg_price: 422000, listings_count: 1225 },
  { date: "2024-03-01", avg_price: 420000, listings_count: 1238 },
  { date: "2024-03-08", avg_price: 423000, listings_count: 1242 },
  { date: "2024-03-15", avg_price: 425000, listings_count: 1247 }
];

export function useMarketStats() {
  return useQuery({
    queryKey: ["market-stats"],
    queryFn: async () => {
      // In production, this would call Appwrite Function
      return mockMarketStats;
    },
    staleTime: 60000,
  });
}

export function usePriceDistribution() {
  return useQuery({
    queryKey: ["price-distribution"],
    queryFn: async () => {
      // In production, this would call Appwrite Function
      return mockPriceDistribution;
    },
    staleTime: 60000,
  });
}

export function useProvinceStats() {
  return useQuery({
    queryKey: ["province-stats"],
    queryFn: async () => {
      // In production, this would call Appwrite Function
      return mockProvinceStats;
    },
    staleTime: 60000,
  });
}

export function useTrendData() {
  return useQuery({
    queryKey: ["trend-data"],
    queryFn: async () => {
      // In production, this would call Appwrite Function
      return mockTrendData;
    },
    staleTime: 60000,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      // In production, this would call Appwrite Function
      return {
        marketStats: mockMarketStats,
        priceDistribution: mockPriceDistribution,
        provinceStats: mockProvinceStats,
        trendData: mockTrendData
      };
    },
    staleTime: 60000,
  });
}
