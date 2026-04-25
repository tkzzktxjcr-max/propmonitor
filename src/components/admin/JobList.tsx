import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ScrapingJob } from "@/types";

interface JobListProps {
  jobs: ScrapingJob[];
  isLoading?: boolean;
  onCancelJob?: (jobId: string) => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "text-amber-600 bg-amber-50",
    label: "Pending",
  },
  running: {
    icon: Loader2,
    color: "text-blue-600 bg-blue-50",
    label: "Running",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600 bg-red-50",
    label: "Failed",
  },
};

const triggerLabels = {
  manual: "Manual",
  scheduled: "Scheduled",
  agent: "Hermes Agent",
  realtime: "Real-time",
};

export function JobList({ jobs, isLoading, onCancelJob }: JobListProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <RefreshCw className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">No scraping jobs</h3>
          <p className="text-sm text-slate-500">
            Start a new scrape to collect property data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sortedJobs.map((job) => {
        const config = statusConfig[job.status];
        const Icon = config.icon;
        const isExpanded = expandedJob === job.$id;
        const progress =
          job.status === "running"
            ? Math.round(
                ((job.stats.new_listings + job.stats.updated + job.stats.failed) /
                  (job.stats.total_found || 1)) *
                  100
              )
            : job.status === "completed" || job.status === "failed"
            ? 100
            : 0;

        return (
          <Card
            key={job.$id}
            className={cn(
              "transition-all",
              job.status === "running" && "border-blue-200 bg-blue-50/30"
            )}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      config.color
                    )}
                  >
                    <Icon
                      className={cn("h-5 w-5", job.status === "running" && "animate-spin")}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize">{job.source}</span>
                      <Badge variant="secondary" className="text-xs">
                        {triggerLabels[job.trigger]}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {job.started_at
                        ? new Date(job.started_at).toLocaleString()
                        : "Not started"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {job.status === "pending" && onCancelJob && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => onCancelJob(job.$id)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedJob(isExpanded ? null : job.$id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress */}
              {(job.status === "running" || job.status === "completed") && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">
                      Progress: {job.stats.new_listings + job.stats.updated + job.stats.failed} / {job.stats.total_found}
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div>
                  <span className="text-slate-500">Found:</span>{" "}
                  <span className="font-medium">{job.stats.total_found}</span>
                </div>
                <div>
                  <span className="text-emerald-600">New:</span>{" "}
                  <span className="font-medium">{job.stats.new_listings}</span>
                </div>
                <div>
                  <span className="text-blue-600">Updated:</span>{" "}
                  <span className="font-medium">{job.stats.updated}</span>
                </div>
                <div>
                  <span className="text-red-600">Failed:</span>{" "}
                  <span className="font-medium">{job.stats.failed}</span>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t px-4 py-4 bg-slate-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Job ID</p>
                    <p className="font-mono text-xs">{job.$id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Created By</p>
                    <p>{job.created_by}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 mb-1">Filters Applied</p>
                    <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                      {JSON.stringify(job.filters, null, 2)}
                    </pre>
                  </div>
                  {job.error_message && (
                    <div className="col-span-2">
                      <p className="text-slate-500 mb-1">Error Message</p>
                      <p className="text-red-600">{job.error_message}</p>
                    </div>
                  )}
                  {job.completed_at && (
                    <div>
                      <p className="text-slate-500 mb-1">Completed At</p>
                      <p>{new Date(job.completed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
