import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_SITES, COLLECTION_JOBS, ID, Query, logAppwriteError } from "@/lib/appwrite";
import type { ScrapingJob, JobStatus, PropertySource, ScrapingJobStats, ScrapingJobFilters } from "@/types";

// ─────────────────────────────────────────────
// DIRECT SCRAPING (no serverless function needed)
// ─────────────────────────────────────────────
async function scrapeSite(site: { slug: string; base_url: string; rate_limit_ms: number }, filters: ScrapingJobFilters): Promise<{ listings: Array<{ sourceId: string; url: string }>; error?: string }> {
  try {
    // Dynamic import of cheerio (must be installed)
    const cheerio = await import("cheerio");
    const axios = (await import("axios")).default;
    
    // Build search URL based on site
    let searchUrl = site.base_url;
    
    // Try to scrape the search page
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 30000,
    });
    
    const $ = cheerio.load(response.data);
    const listings: Array<{ sourceId: string; url: string }> = [];
    
    // Generic selectors - adjust based on actual site structure
    $("a[href*='/property/'], a[href*='/p-'], a[href*='/listing/']").each((i, el) => {
      const href = $(el).attr("href");
      if (href) {
        // Extract ID from URL
        const match = href.match(/\/property\/(\d+)|\/p-(\d+)|\/listing\/(\d+)/);
        if (match) {
          const sourceId = match[1] || match[2] || match[3];
          const url = href.startsWith("http") ? href : site.base_url + href;
          listings.push({ sourceId, url });
        }
      }
    });
    
    return { listings: listings.slice(0, 10) }; // Limit to 10 for demo
  } catch (error) {
    return { listings: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

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
// TRIGGER NEW SCRAPE (direct from browser)
// ─────────────────────────────────────────────
export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      source: PropertySource;
      trigger: "manual" | "agent";
      filters?: ScrapingJobFilters;
    }) => {
      console.log("[useTriggerScrape] Starting scrape for:", params.source);

      // Step 1: Get site document
      let site;
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SITES,
          [Query.equal("slug", params.source), Query.limit(1)]
        );
        
        if (response.documents.length === 0) {
          throw new Error(`Site not found: ${params.source}`);
        }
        
        site = response.documents[0];
        console.log("[useTriggerScrape] Site found:", site.name);
      } catch (error) {
        logAppwriteError("useTriggerScrape - getSite", error);
        throw error;
      }

      // Step 2: Create job document
      const documentData: Record<string, unknown> = {
        site_id: site.$id,
        status: "pending",
        trigger: params.trigger,
        filters: JSON.stringify(params.filters || {}),
        stats: JSON.stringify({ total_found: 0, new_listings: 0, updated: 0, failed: 0 }),
        started_at: new Date().toISOString(),
        completed_at: "",
        error_message: "",
        created_by: params.trigger === "agent" ? "hermes-agent" : "admin@realestate.be",
      };

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

      // Step 3: Update job to running
      await databases.updateDocument(DATABASE_ID, COLLECTION_JOBS, job.$id, {
        status: "running",
      });

      // Step 4: Scrape directly from browser
      console.log("[useTriggerScrape] Scraping site:", site.base_url);
      const { listings, error } = await scrapeSite(site, params.filters || {});

      if (error) {
        console.error("[useTriggerScrape] Scraping error:", error);
        await databases.updateDocument(DATABASE_ID, COLLECTION_JOBS, job.$id, {
          status: "failed",
          error_message: error,
          completed_at: new Date().toISOString(),
        });
      } else {
        console.log("[useTriggerScrape] Found listings:", listings.length);

        const stats = {
          total_found: listings.length,
          new_listings: listings.length,
          updated: 0,
          failed: 0,
        };

        // Step 5: Save properties to database
        for (const listing of listings) {
          try {
            await databases.createDocument(DATABASE_ID, "properties", "unique()", {
              site_id: site.$id,
              source_id: listing.sourceId,
              url: listing.url,
              title: "Property " + listing.sourceId,
              price: 0,
              city: "",
              is_active: true,
              scraped_at: new Date().toISOString(),
              last_updated: new Date().toISOString(),
            });
          } catch (e) {
            console.error("[useTriggerScrape] Failed to save listing:", e);
            stats.failed++;
            stats.new_listings--;
          }
        }

        // Step 6: Update job as completed
        await databases.updateDocument(DATABASE_ID, COLLECTION_JOBS, job.$id, {
          status: "completed",
          stats: JSON.stringify(stats),
          completed_at: new Date().toISOString(),
        });

        // Step 7: Update site
        await databases.updateDocument(DATABASE_ID, COLLECTION_SITES, site.$id, {
          last_scrape_at: new Date().toISOString(),
          last_scrape_status: "success",
        });
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });

      return job;
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