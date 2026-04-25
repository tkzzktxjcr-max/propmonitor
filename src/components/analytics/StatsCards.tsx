import { TrendingUp, TrendingDown, Building2, Euro, Calendar, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MarketStats } from "@/types";

interface StatsCardsProps {
  stats: MarketStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Listings",
      value: stats.total_listings.toLocaleString(),
      icon: Building2,
      trend: "+12%",
      trendUp: true,
      description: "vs last week",
    },
    {
      title: "Average Price",
      value: `€${(stats.avg_price / 1000).toFixed(0)}k`,
      icon: Euro,
      trend: `${stats.price_change_7d > 0 ? "+" : ""}${stats.price_change_7d}%`,
      trendUp: stats.price_change_7d < 0,
      description: "vs last week",
    },
    {
      title: "New Today",
      value: stats.new_listings_today.toString(),
      icon: Calendar,
      trend: "+8",
      trendUp: true,
      description: "vs yesterday",
    },
    {
      title: "New This Week",
      value: stats.new_listings_week.toString(),
      icon: Activity,
      trend: "+24%",
      trendUp: true,
      description: "vs last week",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {card.value}
                </p>
                <div className="flex items-center gap-1">
                  {card.trendUp ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      card.trendUp ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {card.trend}
                  </span>
                  <span className="text-sm text-slate-500">
                    {card.description}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  index === 0
                    ? "bg-blue-100"
                    : index === 1
                    ? "bg-emerald-100"
                    : index === 2
                    ? "bg-amber-100"
                    : "bg-purple-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    index === 0
                      ? "text-blue-600"
                      : index === 1
                      ? "text-emerald-600"
                      : index === 2
                      ? "text-amber-600"
                      : "text-purple-600"
                  )}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
