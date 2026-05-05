import { useQuery } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_PROPERTIES, Query } from "@/lib/appwrite";
import type { MarketStats, PriceDistribution, ProvinceStats, TrendData } from "@/types";

interface AnalyticsData {
  marketStats: MarketStats;
  priceDistribution: PriceDistribution[];
  provinceStats: ProvinceStats[];
  trendData: TrendData[];
}

const EMPTY_ANALYTICS: AnalyticsData = {
  marketStats: {
    total_listings: 0,
    avg_price: 0,
    median_price: 0,
    price_change_7d: 0,
    new_listings_today: 0,
    new_listings_week: 0,
  },
  priceDistribution: [
    { range: "€0-200k", count: 0 },
    { range: "€200-400k", count: 0 },
    { range: "€400-600k", count: 0 },
    { range: "€600-800k", count: 0 },
    { range: "€800k-1M", count: 0 },
    { range: "€1M+", count: 0 },
  ],
  provinceStats: [],
  trendData: [],
};

function getPriceRange(price: number): string {
  if (price < 200000) return "€0-200k";
  if (price < 400000) return "€200-400k";
  if (price < 600000) return "€400-600k";
  if (price < 800000) return "€600-800k";
  if (price < 1000000) return "€800k-1M";
  return "€1M+";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeAnalytics(docs: Record<string, unknown>[]): AnalyticsData {
  if (docs.length === 0) return EMPTY_ANALYTICS;

  const prices = docs.map((d) => (d.price as number) || 0);
  const totalListings = docs.length;
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const medianPrice = Math.round(median(prices));

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentDocs = docs.filter((d) => {
    const dateStr = (d.scraped_at as string) || (d.last_updated as string) || "";
    return dateStr && new Date(dateStr) >= sevenDaysAgo;
  });

  const previousDocs = docs.filter((d) => {
    const dateStr = (d.scraped_at as string) || (d.last_updated as string) || "";
    const date = new Date(dateStr);
    return dateStr && date >= fourteenDaysAgo && date < sevenDaysAgo;
  });

  const recentAvg = recentDocs.length > 0
    ? recentDocs.reduce((a, d) => a + ((d.price as number) || 0), 0) / recentDocs.length
    : 0;
  const previousAvg = previousDocs.length > 0
    ? previousDocs.reduce((a, d) => a + ((d.price as number) || 0), 0) / previousDocs.length
    : 0;

  const priceChange7d = previousAvg > 0
    ? Math.round(((recentAvg - previousAvg) / previousAvg) * 1000) / 10
    : 0;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newListingsToday = docs.filter((d) => {
    const dateStr = (d.scraped_at as string) || "";
    return dateStr && new Date(dateStr) >= todayStart;
  }).length;

  const newListingsWeek = docs.filter((d) => {
    const dateStr = (d.scraped_at as string) || "";
    return dateStr && new Date(dateStr) >= weekStart;
  }).length;

  // Price distribution
  const rangeCounts: Record<string, number> = {
    "€0-200k": 0,
    "€200-400k": 0,
    "€400-600k": 0,
    "€600-800k": 0,
    "€800k-1M": 0,
    "€1M+": 0,
  };
  prices.forEach((p) => {
    const range = getPriceRange(p);
    rangeCounts[range] = (rangeCounts[range] || 0) + 1;
  });
  const priceDistribution: PriceDistribution[] = Object.entries(rangeCounts).map(
    ([range, count]) => ({ range, count })
  );

  // Province stats
  const provinceMap = new Map<string, { prices: number[]; count: number }>();
  docs.forEach((d) => {
    const province = (d.province as string) || "Unknown";
    if (!provinceMap.has(province)) {
      provinceMap.set(province, { prices: [], count: 0 });
    }
    const entry = provinceMap.get(province)!;
    entry.prices.push((d.price as number) || 0);
    entry.count++;
  });
  const provinceStats: ProvinceStats[] = Array.from(provinceMap.entries())
    .map(([province, data]) => ({
      province,
      avg_price: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
      listings_count: data.count,
    }))
    .sort((a, b) => b.listings_count - a.listings_count);

  // Trend data (group by day, last 30 days)
  const trendMap = new Map<string, { prices: number[]; count: number }>();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  docs.forEach((d) => {
    const dateStr = (d.scraped_at as string) || (d.last_updated as string) || "";
    if (!dateStr) return;
    const date = new Date(dateStr);
    if (date < thirtyDaysAgo) return;
    const dayKey = date.toISOString().split("T")[0];
    if (!trendMap.has(dayKey)) {
      trendMap.set(dayKey, { prices: [], count: 0 });
    }
    const entry = trendMap.get(dayKey)!;
    entry.prices.push((d.price as number) || 0);
    entry.count++;
  });
  const trendData: TrendData[] = Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      avg_price: Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length),
      listings_count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    marketStats: {
      total_listings: totalListings,
      avg_price: avgPrice,
      median_price: medianPrice,
      price_change_7d: priceChange7d,
      new_listings_today: newListingsToday,
      new_listings_week: newListingsWeek,
    },
    priceDistribution,
    provinceStats,
    trendData,
  };
}

export function useAnalyticsFromDB() {
  return useQuery({
    queryKey: ["analytics-from-db"],
    queryFn: async () => {
      try {
        const allDocs: Record<string, unknown>[] = [];
        let cursor: string | undefined;

        // Paginate up to 5000 properties
        for (let i = 0; i < 2; i++) {
          const queries: string[] = [
            Query.equal("is_active", true),
            Query.limit(2500),
            Query.orderDesc("$createdAt"),
          ];

          if (cursor) {
            queries.push(Query.cursorAfter(cursor));
          }

          const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_PROPERTIES,
            queries
          );

          allDocs.push(...(response.documents as unknown as Record<string, unknown>[]));

          if (response.documents.length < 2500) break;
          cursor = response.documents[response.documents.length - 1].$id;
        }

        return computeAnalytics(allDocs);
      } catch (error) {
        console.error("[useAnalyticsFromDB] Failed to fetch analytics:", error);
        return EMPTY_ANALYTICS;
      }
    },
    staleTime: 60000,
  });
}