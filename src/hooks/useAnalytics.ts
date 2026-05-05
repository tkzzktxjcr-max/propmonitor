import { useAnalyticsFromDB } from "./useAnalyticsFromDB";
import type { MarketStats, PriceDistribution, ProvinceStats, TrendData } from "@/types";

const EMPTY_MARKET_STATS: MarketStats = {
  total_listings: 0,
  avg_price: 0,
  median_price: 0,
  price_change_7d: 0,
  new_listings_today: 0,
  new_listings_week: 0,
};

export function useMarketStats() {
  const { data, isLoading } = useAnalyticsFromDB();
  return {
    data: data?.marketStats || EMPTY_MARKET_STATS,
    isLoading,
  };
}

export function usePriceDistribution() {
  const { data, isLoading } = useAnalyticsFromDB();
  return {
    data: data?.priceDistribution || [],
    isLoading,
  };
}

export function useProvinceStats() {
  const { data, isLoading } = useAnalyticsFromDB();
  return {
    data: data?.provinceStats || [],
    isLoading,
  };
}

export function useTrendData() {
  const { data, isLoading } = useAnalyticsFromDB();
  return {
    data: data?.trendData || [],
    isLoading,
  };
}

export function useAnalytics() {
  const { data, isLoading } = useAnalyticsFromDB();
  return {
    data,
    isLoading,
  };
}