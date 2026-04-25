import { useState } from "react";
import {
  Info,
  AlertTriangle,
  XCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrapingLogs, useJobLogs } from "@/hooks/useScrapingLogs";
import { useSites } from "@/hooks/useSites";
import type { ScrapingLog, LogLevel, ScrapingJob } from "@/types";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// LOG LEVEL CONFIG
// ─────────────────────────────────────────────
const logLevelConfig: Record<
  LogLevel,
  { icon: typeof Info; color: string; bgColor: string }
> = {
  INFO: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  ERROR: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
};

// ─────────────────────────────────────────────
// SINGLE LOG ENTRY
// ─────────────────────────────────────────────
interface LogEntryProps {
  log: ScrapingLog;
  siteName?: string;
}

function LogEntry({ log, siteName }: LogEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = logLevelConfig[log.level];
  const Icon = config.icon;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "border rounded-lg p-3 transition-all",
          config.bgColor,
          hasMetadata && "cursor-pointer"
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.color)} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={cn("text-xs uppercase font-bold", config.color)}
              >
                {log.level}
              </Badge>
              <span className="text-xs text-slate-500">
                {formatDate(log.created_at)} {formatTime(log.created_at)}
              </span>
              {siteName && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-600">{siteName}</span>
                </>
              )}
            </div>

            <p className="text-sm text-slate-700 font-mono">{log.message}</p>
          </div>

          {hasMetadata && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {hasMetadata && (
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">
                Metadata
              </p>
              <pre className="text-xs bg-white/50 p-2 rounded overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────
// LOG LIST FOR SINGLE JOB
// ─────────────────────────────────────────────
interface JobLogListProps {
  job: ScrapingJob;
}

export function JobLogList({ job }: JobLogListProps) {
  const { data: logs, isLoading } = useJobLogs(job.$id);
  const { data: sites } = useSites();

  const siteName = sites?.find((s) => s.$id === job.site_id)?.name;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No logs available for this job</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <LogEntry key={log.$id} log={log} siteName={siteName} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ALL LOGS VIEW
// ─────────────────────────────────────────────
interface ScrapingLogsProps {
  jobId?: string; // Optional - if provided, shows only logs for this job
}

export function ScrapingLogs({ jobId }: ScrapingLogsProps) {
  const { data: sites } = useSites();

  const [filters, setFilters] = useState<{
    site_id?: string;
    level?: LogLevel;
    limit: number;
  }>({
    limit: 100,
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data: logs, isLoading, refetch } = useScrapingLogs({
    ...(jobId && { job_id: jobId }),
    ...(filters.site_id && { site_id: filters.site_id }),
    ...(filters.level && { level: filters.level }),
    limit: filters.limit,
  });

  // Group logs by date
  const groupedLogs = logs?.reduce((groups, log) => {
    const date = new Date(log.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, ScrapingLog[]>);

  // Stats
  const errorCount = logs?.filter((l) => l.level === "ERROR").length || 0;
  const warningCount = logs?.filter((l) => l.level === "WARNING").length || 0;
  const infoCount = logs?.filter((l) => l.level === "INFO").length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Scraping Logs</h2>
          <p className="text-sm text-slate-500">
            Real-time logs from scraping operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Label className="text-xs text-slate-500 mb-1 block">Site</Label>
                <Select
                  value={filters.site_id || "all"}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      site_id: v === "all" ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sites</SelectItem>
                    {sites?.map((site) => (
                      <SelectItem key={site.$id} value={site.$id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Label className="text-xs text-slate-500 mb-1 block">Level</Label>
                <Select
                  value={filters.level || "all"}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      level: v === "all" ? undefined : (v as LogLevel),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARNING">WARNING</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <Label className="text-xs text-slate-500 mb-1 block">Limit</Label>
                <Select
                  value={filters.limit.toString()}
                  onValueChange={(v) =>
                    setFilters({ ...filters, limit: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 logs</SelectItem>
                    <SelectItem value="100">100 logs</SelectItem>
                    <SelectItem value="200">200 logs</SelectItem>
                    <SelectItem value="500">500 logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600">INFO</span>
          <span className="font-semibold">{infoCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-600">WARN</span>
          <span className="font-semibold">{warningCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-600">ERROR</span>
          <span className="font-semibold">{errorCount}</span>
        </div>
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs && logs.length > 0 ? (
        <ScrollArea className="h-[500px]">
          <div className="space-y-6 pr-4">
            {Object.entries(groupedLogs || {}).map(([date, dateLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-600">{date}</span>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-2">
                  {dateLogs.map((log) => {
                    const siteName = sites?.find(
                      (s) => s.$id === log.site_id
                    )?.name;
                    return (
                      <LogEntry key={log.$id} log={log} siteName={siteName} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-1">No logs found</h3>
            <p className="text-sm text-slate-500">
              {filters.site_id || filters.level
                ? "Try adjusting your filters"
                : "Logs will appear here when scraping operations run"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper
import { Label } from "@/components/ui/label";