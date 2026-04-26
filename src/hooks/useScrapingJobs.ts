import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, functions, DATABASE_ID, COLLECTION_SITES, COLLECTION_JOBS, ID, Query, logAppwriteError, client as appwriteClient } from "@/lib/appwrite";
import type { ScrapingJob, JobStatus, PropertySource, ScrapingJobStats, ScrapingJobFilters } from "@/types";

const SCRAPER_ENGINE_ID = "scraper-engine";

// ─────────────────────────────────────────────
// FETCH ALL JOBS
// ─────────────────────────────────────────────
export function useScrapingJobs() {
  return useQuery({
    queryKey: ["scraping-jobs"],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_JOBS, [
          Query.orderDesc("started_at"),
          Query.limit(50),
        ]);
        return response.documents.map(transformJobDocument) as ScrapingJob[];
      } catch (error) {
        logAppwriteError("useScrapingJobs - listDocuments", error);
        throw error;
      }
    },
    staleTime: 10000,
    refetchInterval: 5000, // Poll more frequently
  });
}

// ─────────────────────────────────────────────
// FETCH SINGLE JOB
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
// CHECK FUNCTION EXECUTION STATUS
// ─────────────────────────────────────────────
export function useExecutionStatus(executionId: string | null) {
  return useQuery({
    queryKey: ["execution-status", executionId],
    queryFn: async () => {
      if (!executionId) return null;
      
      try {
        const response = await functions.getExecution(SCRAPER_ENGINE_ID, executionId);
        console.log("[useExecutionStatus] Execution", executionId, "status:", response.status);
        return response;
      } catch (error) {
        console.error("[useExecutionStatus] Failed to get execution:", error);
        return null;
      }
    },
    enabled: !!executionId,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: false,
  });
}

// ─────────────────────────────────────────────
// TRIGGER NEW SCRAPE
// ─────────────────────────────────────────────
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      source: PropertySource;
      trigger: "manual" | "agent";
      filters?: ScrapingJobFilters;
    }): Promise<{ job: ScrapingJob; executionId: string }> => {
      console.log("[useTriggerScrape] Starting with params:", params);

      // Step 1: Get site document ID
      let siteId: string;
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SITES,
          [Query.equal("slug", params.source), Query.limit(1)]
        );
        
        if (response.documents.length === 0) {
          throw new Error(`Site not found: ${params.source}. Make sure the site slug matches exactly.`);
        }
        
        siteId = response.documents[0].$id;
        console.log("[useTriggerScrape] Site found, ID:", siteId);
      } catch (error) {
        logAppwriteError("useTriggerScrape - getSite", error);
        throw error;
      }

      // Step 2: Create job document
      const documentData: Record<string, unknown> = {
        site_id: siteId,
        status: "pending",
        trigger: params.trigger,
        filters: JSON.stringify(params.filters || {}),
        stats: JSON.stringify({ total_found: 0, new_listings: 0, updated: 0, failed: 0 }),
        started_at: new Date().toISOString(),
        completed_at: "",
        error_message: "",
        created_by: params.trigger === "agent" ? "hermes-agent" : "admin@realestate.be",
      };

      console.log("[useTriggerScrape] Creating job document...");
      let job: ScrapingJob;
      try {
        const response = await databases.createDocument(
          DATABASE_ID,
          COLLECTION_JOBS,
          ID.unique(),
          documentData
        );
        job = transformJobDocument(response) as ScrapingJob;
        console.log("[useTriggerScrape] Job created:", job.$id);
      } catch (error) {
        logAppwriteError("useTriggerScrape - createDocument", error);
        throw error;
      }

      // Step 3: Trigger function ASYNC
      console.log("[useTriggerScrape] Triggering scraper-engine (async)...");
      let executionId = "";
      try {
        const execution = await functions.createExecution(
          SCRAPER_ENGINE_ID,
          JSON.stringify({ source: params.source, siteId, jobId: job.$id }),
          true // async = true
        );
        executionId = execution.$id;
        console.log("[useTriggerScrape] Execution triggered:", executionId, "status:", execution.status);
      } catch (error) {
        logAppwriteError("useTriggerScrape - createExecution", error);
        console.error("[useTriggerScrape] Function trigger failed:", error);
        // Don't throw - job is created, function can be retried
      }

      return { job, executionId };
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