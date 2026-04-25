import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  StatsCards,
  PriceDistributionChart,
  TrendChart,
  ProvinceStatsTable,
} from "@/components/analytics";
import {
  useMarketStats,
  usePriceDistribution,
  useProvinceStats,
  useTrendData,
} from "@/hooks/useAnalytics";
import { Calendar, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useMarketStats();
  const { data: priceDist, isLoading: priceLoading } = usePriceDistribution();
  const { data: provinceStats, isLoading: provinceLoading } = useProvinceStats();
  const { data: trendData, isLoading: trendLoading } = useTrendData();

  const isLoading = statsLoading || priceLoading || provinceLoading || trendLoading;

  if (isLoading || !stats || !priceDist || !provinceStats || !trendData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex">
          <aside className="hidden lg:block w-72 border-r bg-white min-h-[calc(100vh-4rem)]">
            <Sidebar />
          </aside>
          <main className="flex-1 p-6">
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-200 rounded-xl" />
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-80 bg-slate-200 rounded-xl" />
                <div className="h-80 bg-slate-200 rounded-xl" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 border-r bg-white min-h-[calc(100vh-4rem)]">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
                <p className="text-slate-500 mt-1">
                  Market insights and trends from scraped property data
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select defaultValue="30d">
                  <SelectTrigger className="w-40">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-8">
              <StatsCards stats={stats} />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <TrendChart data={trendData} />
              <PriceDistributionChart data={priceDist} />
            </div>

            {/* Province Stats Table */}
            <ProvinceStatsTable data={provinceStats} />
          </div>
        </main>
      </div>
    </div>
  );
}
