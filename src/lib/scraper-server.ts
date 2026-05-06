import type { PropertySource, PropertyType, ScrapingJob, ScrapingJobFilters, ScrapingJobStats, JobStatus } from "@/types";

const SCRAPER_API_URL = import.meta.env.VITE_SCRAPER_API_URL || "https://scrap.071098v2.duckdns.org";

export interface TriggerScrapeParams {
  source: PropertySource;
  trigger: "manual" | "agent";
  filters?: ScrapingJobFilters;
}

export interface TriggerScrapeResponse {
  jobId: string;
  status: "queued";
  message: string;
  rateLimit?: {
    remaining: number;
    resetIn: number;
  };
}

export interface TestScrapeResponse {
  success: boolean;
  searchUrl: string;
  listingsFound: number;
  sampleListings: Array<{
    source_id: string;
    title: string;
    price: number;
    city: string;
    url: string;
  }>;
  detailSample: Record<string, unknown> | null;
  error?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  trigger: "manual" | "agent" | "scheduled" | "realtime";
  filters: ScrapingJobFilters;
  stats: ScrapingJobStats;
  started_at: string;
  completed_at: string;
  error_message: string;
  created_by: string;
  queueStatus?: {
    isQueued: boolean;
    isRunning: boolean;
  };
}

export interface QueueStatusResponse {
  running: number;
  queued: number;
  maxConcurrent: number;
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
  version: string;
  environment: string;
}

// ─────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Trigger a new scrape job on the scraper server
 */
export async function triggerScraper(params: TriggerScrapeParams): Promise<TriggerScrapeResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/api/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: params.source,
      trigger: params.trigger,
      filters: params.filters,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.message || error.error || "Failed to trigger scrape");
  }

  return response.json();
}

/**
 * Run a test scrape without saving (returns raw results)
 */
export async function testScraper(source: PropertySource, filters?: ScrapingJobFilters): Promise<TestScrapeResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/api/scrape/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source,
      filters,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.message || error.error || "Test scrape failed");
  }

  return response.json();
}

/**
 * Check the status of a scrape job
 */
export async function checkJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/api/scrape/status/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.message || error.error || "Failed to get job status");
  }

  return response.json();
}

/**
 * Get the current queue status
 */
export async function getQueueStatus(): Promise<QueueStatusResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/api/scrape/queue`);

  if (!response.ok) {
    throw new Error("Failed to get queue status");
  }

  return response.json();
}

/**
 * Check the health of the scraper server
 */
export async function checkScraperHealth(): Promise<HealthResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/health`);

  if (!response.ok) {
    throw new Error("Scraper server is not healthy");
  }

  return response.json();
}

// ─────────────────────────────────────────────
// TYPE CONVERTERS
// ─────────────────────────────────────────────

/**
 * Convert the scraper server response to our ScrapingJob type
 */
export function toScrapingJob(response: JobStatusResponse): ScrapingJob {
  return {
    $id: response.jobId,
    site_id: "",
    status: response.status,
    trigger: response.trigger,
    filters: response.filters,
    stats: response.stats,
    started_at: response.started_at,
    completed_at: response.completed_at,
    error_message: response.error_message,
    created_by: response.created_by,
  };
}