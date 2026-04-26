import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Building2,
  BarChart3,
  Settings,
  Shield,
  Layers,
  MapPin,
  ChevronLeft,
  Loader2,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useScrapingJobs } from "@/hooks/useScrapingJobs";

interface SidebarProps {
  onNavigate?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Alcohol Tracker", href: "/alcohol", icon: Wine },
];

const adminNavigation = [
  { name: "Admin Panel", href: "/admin", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { data: jobs } = useScrapingJobs();
  
  const runningJobs = jobs?.filter((j) => j.status === "running") || [];
  const pendingJobs = jobs?.filter((j) => j.status === "pending") || [];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 border-b">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <span className="font-bold text-lg text-slate-800">BelRealty</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-blue-600")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        {/* Active Jobs Status */}
        {(runningJobs.length > 0 || pendingJobs.length > 0) && (
          <div className="mb-4">
            <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Scrapes
            </h3>
            <div className="space-y-1">
              {runningJobs.map((job) => (
                <div
                  key={job.$id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-emerald-50 text-emerald-700 text-sm"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="truncate flex-1">{job.site_id}</span>
                </div>
              ))}
              {pendingJobs.map((job) => (
                <div
                  key={job.$id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-amber-50 text-amber-700 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="truncate flex-1">{job.site_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Admin Navigation */}
        <div>
          <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Admin
          </h3>
          <nav className="space-y-1">
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-blue-600")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Layers className="h-4 w-4" />
          <span>v1.0.0</span>
          <span className="mx-1">•</span>
          <MapPin className="h-3 w-3" />
          <span>Belgium</span>
        </div>
      </div>
    </div>
  );
}