import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_JOBS, ID, Query, isDemoMode } from "@/lib/appwrite";
import type { ScrapingJob, JobStatus, PropertySource, ScrapingJobStats, ScrapingJobFilters } from "@/types";

// ─────────────────────────────────────────────
// MOCK DATA (Demo Mode)
// ─────────────────────────────────────────────
const mockJobs: ScrapingJob[] = [
  {
    $id: "job-1",
    site_id: "site-immoweb",
    status: "completed",
    trigger: "scheduled",
    filters: { city: "Brussels", price_max: 500000, type: "apartment" },
    stats: { total_found: 245, new_listings: 12, updated: 34, failed: 2 },
    started_at: "2024-03-20T02:00:00Z",
    completed_at: "2024-03-20T02:45:00Z",
    error_message: "",
    created_by: "system",
  },
  {
    $id: "job-2",
    site_id: "site-immovlan",
    status: "completed",
    trigger: "scheduled",
    filters: { province: "East Flanders", type: "house" },
    stats: { total_found: 189, new_listings: 8, updated: 21, failed: 0 },
    started_at: "2024-03-20T03:00:00Z",
    completed_at: "2024-03-20T03:30:00Z",
    error_message: "",
    created_by: "system",
  },
  {
    $id: "job-3",
    site_id: "site-zimmo",
    status: "running",
    trigger: "agent",
    filters: { city: "Antwerp", price_max: 1000000 },
    stats: { total_found: 156, new_listings: 4, updated: 12, failed: 1 },
    started_at: "2024-03-20T10:00:00Z",
    completed_at: "",
    error_message: "",
    created_by: "hermes-agent",
  },
  {
    $id: "job-4",
    site_id: "site-immoweb",
    status: "pending",
    trigger: "manual",
    filters: { city: "Ghent", type: "apartment" },
    stats: { total_found: 0, new_listings: 0, updated: 0, failed: 0 },
    started_at: "",
    completed_at: "",
    error_message: "",
    created_by: "admin@realestate.be",
  },
  {
    $id: "job-5",
    site_id: "site-immovlan",
    status: "failed",
    trigger: "scheduled",
    filters: { province: "Liège" },
    stats: { total_found: 45, new_listings: 2, updated: 5, failed: 40 },
    started_at: "2024-03-19T02:00:00Z",
    completed_at: "2024-03-19T02:15:00Z",
    error_message: "Rate limit exceeded - IP temporarily blocked",
    created_by: "system",
  },
];

// ─────────────────────────────────────────────
// FETCH ALL JOBS
// ─────────────────────────────────────────────
export function useScrapingJobs() {
  return useQuery({
    queryKey: ["scraping-jobs"],
    queryFn: async () => {
      if (isDemoMode()) {
        return [...mockJobs].sort(
          (a, b) =>
            new Date(b.started_at || 0).getTime() -
            new Date(a.started_at || 0).getTime()
        );
      }

      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_JOBS, [
        Query.orderDesc("started_at"),
        Query.limit(50),
      ]);

      return response.documents.map(transformJobDocument) as ScrapingJob[];
    },
    staleTime: 10000,
    refetchInterval: 30000, // Poll every 30s for running jobs
  });
}

// ─────────────────────────────────────────────
// FETCH SINGLE JOB
// ─────────────────────────────────────────────
export function useScrapingJob(id: string) {
  return useQuery({
    queryKey: ["scraping-job", id],
    queryFn: async () => {
      if (isDemoMode()) {
        return mockJobs.find((j) => j.$id === id) || null;
      }

      const response = await databases.getDocument(DATABASE_ID, COLLECTION_JOBS, id);
      return transformJobDocument(response) as ScrapingJob;
    },
    enabled: !!id,
    refetchInterval: 5000, // Poll every 5s for active jobs
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
    }) => {
      if (isDemoMode()) {
        const newJob: ScrapingJob = {
          $id: `job-${Date.now()}`,
          site_id: `site-${params.source}`,
          status: "pending",
          trigger: params.trigger,
          filters: params.filters || {},
          stats: { total_found: 0, new_listings: 0, updated: 0, failed: 0 },
          started_at: "",
          completed_at: "",
          error_message: "",
          created_by: params.trigger === "agent" ? "hermes-agent" : "admin@realestate.be",
        };
        mockJobs.push(newJob);
        return newJob;
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_JOBS,
        ID.unique(),
        {
          site_id: params.source,
          status: "pending",
          trigger: params.trigger,
          filters: params.filters || {},
          stats: { total_found: 0, new_listings: 0, updated: 0, failed: 0 },
          created_by: params.trigger === "agent" ? "hermes-agent" : "admin@realestate.be",
        }
      );

      return transformJobDocument(response) as ScrapingJob;
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
      if (isDemoMode()) {
        const job = mockJobs.find((j) => j.$id === jobId);
        if (job && job.status === "pending") {
          job.status = "failed";
          job.error_message = "Cancelled by user";
          job.completed_at = new Date().toISOString();
          return job;
        }
        throw new Error("Job cannot be cancelled");
      }

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
    },
  });
}

// ─────────────────────────────────────────────
// UPDATE JOB STATUS (internal use)
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
      if (isDemoMode()) {
        const job = mockJobs.find((j) => j.$id === jobId);
        if (job) {
          job.status = status;
          if (stats) job.stats = stats;
          if (error_message) job.error_message = error_message;
          if (status === "completed" || status === "failed") {
            job.completed_at = new Date().toISOString();
          }
          return job;
        }
        throw new Error("Job not found");
      }

      const updateData: any = { status };
      if (stats) updateData.stats = stats;
      if (error_message) updateData.error_message = error_message;
      if (status === "completed" || status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_JOBS,
        jobId,
        updateData
      );

      return transformJobDocument(response) as ScrapingJob;
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
function transformJobDocument(doc: any): ScrapingJob {
  return {
    $id: doc.$id,
    site_id: doc.site_id,
    status: doc.status,
    trigger: doc.trigger,
    filters: doc.filters || {},
    stats: doc.stats || {
      total_found: 0,
      new_listings: 0,
      updated: 0,
      failed: 0,
    },
    started_at: doc.started_at || "",
    completed_at: doc.completed_at || "",
    error_message: doc.error_message || "",
    created_by: doc.created_by || "unknown",
  };
}