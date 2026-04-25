import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { PropertyGrid, PropertyFilters } from "@/components/properties";
import { useProperties } from "@/hooks/useProperties";
import type { PropertyFilters as Filters } from "@/types";

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const { data: properties, isLoading } = useProperties(filters);

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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Properties</h1>
              <p className="text-slate-500 mt-1">
                Browse and search through {properties?.length || 0} Belgian real estate listings
              </p>
            </div>

            <div className="flex gap-6">
              {/* Desktop Filters */}
              <aside className="hidden lg:block w-72 flex-shrink-0">
                <div className="sticky top-24">
                  <PropertyFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>
              </aside>

              {/* Property Grid */}
              <div className="flex-1">
                <PropertyGrid
                  properties={properties || []}
                  filters={filters}
                  onFiltersChange={setFilters}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
