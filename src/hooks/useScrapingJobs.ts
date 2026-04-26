import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, functions, DATABASE_ID, COLLECTION_SITES, COLLECTION_JOBS, ID, Query, logAppwriteError } from "@/lib/appwrite";
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
    refetchInterval: 30000,
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
    refetchInterval: 5000,
  });
}

// ─────────────────────────────────────────────
// HELPER: Get site document ID by slug
// ─────────────────────────────────────────────
async function getSiteIdBySlug(source: PropertySource): Promise<string | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_SITES,
      [Query.equal("slug", source), Query.limit(1)]
    );
    
    if (response.documents.length > 0) {
      return response.documents[0].$id;
    }
    
    try {
      await databases.getDocument(DATABASE_ID, COLLECTION_SITES, source);
      return source;
    } catch {
      return null;
    }
  } catch (error) {
    console.error("[getSiteIdBySlug] Error:", error);
    return null;
  }
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
    }) => {
      // Step 1: Get the actual site document ID
      console.log("[useTriggerScrape] Looking up site by slug:", params.source);
      const siteId = await getSiteIdBySlug(params.source);
      
      if (!siteId) {
        throw new Error(`Site not found: ${params.source}`);
      }
      console.log("[useTriggerScrape] Found site ID:", siteId);

      // Step 2: Create the job document
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
        logAppwriteError("useTriggerScrape - createDocument", error, documentData);
        throw error;
      }

      // Step 3: Trigger the scraper-engine function
      // Data must be a string for the SDK
      const functionPayload = JSON.stringify({
        jobId: job.$id,
        siteId: siteId,
        filters: params.filters || {},
      });

      console.log("[useTriggerScrape] Triggering scraper-engine with payload:", functionPayload);
      try {
        const execution = await functions.createExecution(
          SCRAPER_ENGINE_ID,
          functionPayload,
          false // synchronous
        );
        console.log("[useTriggerScrape] Execution result:", execution.$id, execution.status);
      } catch (error) {
        logAppwriteError("useTriggerScrape - createExecution", error);
        console.warn("[useTriggerScrape] Function trigger failed, but job was created");
      }

      return job;
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
        logAppwriteError(`useUpdateJobStatus - updateDocument(${jobId})`, error, updateData);
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
    try {
      filters = JSON.parse(filters);
    } catch {
      filters = {};
    }
  }

  let stats = d.stats;
  if (typeof stats === "string") {
    try {
      stats = JSON.parse(stats);
    } catch {
      stats = { total_found: 0, new_listings: 0, updated: 0, failed: 0 };
    }
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