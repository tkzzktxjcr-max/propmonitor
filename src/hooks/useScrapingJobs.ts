import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_SITES, COLLECTION_JOBS, ID, Query, logAppwriteError } from "@/lib/appwrite";
import { triggerScraper, checkJobStatus, toScrapingJob, checkScraperHealth } from "@/lib/scraper-server";
import type { ScrapingJob, JobStatus, PropertySource, ScrapingJobStats, ScrapingJobFilters } from "@/types";

// ─────────────────────────────────────────────
// FETCH ALL JOBS (from Appwrite)
// ─────────────────────────────────────────────
export function useScrapingJobs() {
  return useQuery({
    queryKey: ["scraping-jobs"],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_JOBS, [
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ]);
        return response.documents.map(transformJobDocument) as ScrapingJob[];
      } catch (error) {
        logAppwriteError("useScrapingJobs - listDocuments", error);
        throw error;
      }
    },
    staleTime: 10000,
    refetchInterval: 5000,
  });
}

// ─────────────────────────────────────────────
// FETCH SINGLE JOB (from Appwrite)
// ─────────────────────────────────────────────
export function useScrapingJob(id: string) {
  return useQuery({
    queryKey: ["scraping-job", id],
    queryFn: async () => {
      try {
        const response = await databases.getDocument(DATABASE_ID, COLLECTION_JOBS, id);
        return transformJobDocument(response) as ScrapingJob;
      } catch (error) {
        logAppwriteError(`useScrapingJob - getDocument(${id})`, error);
        throw error;
      }
    },
    enabled: !!id,
    refetchInterval: 3000,
  });
}

// ─────────────────────────────────────────────
// FETCH JOB STATUS (from Scraper Server)
// ─────────────────────────────────────────────
export function useScraperServerJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["scraper-server-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      try {
        const response = await checkJobStatus(jobId);
        return toScrapingJob(response);
      } catch (error) {
        console.error("[useScraperServerJobStatus] Failed to get job status from scraper server:", error);
        return null;
      }
    },
    enabled: !!jobId,
    refetchInterval: 2000,
    retry: false,
  });
}

// ─────────────────────────────────────────────
// CHECK SCRAPER SERVER HEALTH
// ─────────────────────────────────────────────
export function useScraperServerHealth() {
  return useQuery({
    queryKey: ["scraper-server-health"],
    queryFn: checkScraperHealth,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 2,
  });
}

// ─────────────────────────────────────────────
// TRIGGER NEW SCRAPE (via Scraper Server only — no frontend Appwrite write)
// ─────────────────────────────────────────────
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      source: PropertySource;
      trigger: "manual" | "agent";
      filters?: ScrapingJobFilters;
    }): Promise<{ jobId: string; message: string }> => {
      console.log("[useTriggerScrape] Starting with params:", params);

      // Step 1: Call Scraper Server directly — it will create the job in Appwrite using its API key
      console.log("[useTriggerScrape] Calling scraper server...");
      try {
        const result = await triggerScraper({
          source: params.source,
          trigger: params.trigger,
          filters: params.filters,
        });
        
        console.log("[useTriggerScrape] Scraper server response:", result);
        return { jobId: result.jobId, message: result.message };
      } catch (error) {
        console.error("[useTriggerScrape] Scraper server call failed:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to connect to scraper server");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
    },
  });
}

// ─────────────────────────────────────────────
// CANCEL JOB
// ─────────────────────────────────────────────
export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      try {
        const response = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_JOBS,
          jobId,
          {
            status: "failed",
            error_message: "Cancelled by user",
            completed_at: new Date().toISOString(),
          }
        );
        return transformJobDocument(response) as ScrapingJob;
      } catch (error) {
        logAppwriteError(`useCancelJob - updateDocument(${jobId})`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
    },
  });
}

// ─────────────────────────────────────────────
// UPDATE JOB STATUS
// ─────────────────────────────────────────────
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      status,
      stats,
      error_message,
    }: {
      jobId: string;
      status: JobStatus;
      stats?: ScrapingJobStats;
      error_message?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (stats) updateData.stats = JSON.stringify(stats);
      if (error_message) updateData.error_message = error_message;
      if (status === "completed" || status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }

      try {
        const response = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_JOBS,
          jobId,
          updateData
        );
        return transformJobDocument(response) as ScrapingJob;
      } catch (error) {
        logAppwriteError(`useUpdateJobStatus - updateDocument(${jobId})`, error);
        throw error;
      }
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["scraping-job", jobId] });
    },
  });
}

// ─────────────────────────────────────────────
// HELPER: Transform Appwrite document to ScrapingJob
// ─────────────────────────────────────────────
function transformJobDocument(doc: unknown): ScrapingJob {
  const d = doc as Record<string, unknown>;
  
  let filters = d.filters;
  if (typeof filters === "string") {
    try { filters = JSON.parse(filters); } catch { filters = {}; }
  }

  let stats = d.stats;
  if (typeof stats === "string") {
    try { stats = JSON.parse(stats); } catch { stats = { total_found: 0, new_listings: 0, updated: 0, failed: 0 }; }
  }

  return {
    $id: d.$id as string,
    site_id: d.site_id as string,
    status: d.status as ScrapingJob["status"],
    trigger: d.trigger as ScrapingJob["trigger"],
    filters: (filters || {}) as ScrapingJobFilters,
    stats: (stats || { total_found: 0, new_listings: 0, updated: 0, failed: 0 }) as ScrapingJobStats,
    started_at: (d.started_at as string) || "",
    completed_at: (d.completed_at as string) || "",
    error_message: (d.error_message as string) || "",
    created_by: (d.created_by as string) || "unknown",
  };
}