const SCRAPER_API_URL = import.meta.env.VITE_SCRAPER_API_URL || "https://scrap.071098v2.duckdns.org";

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
  screenshotPath?: string;
  error?: string;
  diagnostic?: {
    tip: string;
    screenshot: string;
  };
}

export interface ScraperJobResponse {
  jobId: string;
  status: string;
  message: string;
  rateLimit?: {
    remaining: number;
    resetIn: number;
  };
}

export interface ScraperJobStatus {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  trigger: string;
  filters: Record<string, unknown>;
  stats: {
    total_found: number;
    new_listings: number;
    updated: number;
    failed: number;
  };
  started_at: string;
  completed_at: string;
  error_message: string;
  created_by: string;
  queueStatus: {
    isQueued: boolean;
    isRunning: boolean;
  };
}

export interface ScraperHealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  queue: {
    activeJobs: number;
    jobs: Array<{ id: string; name: string; cron: string }>;
  };
  scheduler: {
    activeJobs: number;
    jobs: Array<{ id: string; name: string; cron: string }>;
  };
  uptime: number;
}

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
export async function checkScraperHealth(): Promise<ScraperHealthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SCRAPER_API_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Scraper server health check failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Scraper server is not responding (timeout)");
    }
    throw new Error(`Cannot connect to scraper server at ${SCRAPER_API_URL}. Is it running?`);
  }
}

// ─────────────────────────────────────────────
// TRIGGER SCRAPE
// ─────────────────────────────────────────────
export async function triggerScraper(params: {
  source: string;
  trigger: "manual" | "agent";
  filters?: Record<string, unknown>;
}): Promise<ScraperJobResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${SCRAPER_API_URL}/api/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Scraper server error: ${response.status} - ${error}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. The scraper server may be overloaded.");
    }
    throw error;
  }
}

// ─────────────────────────────────────────────
// CHECK JOB STATUS
// ─────────────────────────────────────────────
export async function checkJobStatus(jobId: string): Promise<ScraperJobStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SCRAPER_API_URL}/api/scrape/status/${jobId}`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get job status: ${response.status} - ${error}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ─────────────────────────────────────────────
// TEST SCRAPE
// ─────────────────────────────────────────────
export async function testScraper(source: string, filters?: Record<string, unknown>): Promise<TestScrapeResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${SCRAPER_API_URL}/api/scrape/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, filters }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Test scrape failed: ${response.status} - ${error}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Test scrape timed out after 2 minutes");
    }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(`Cannot connect to scraper server at ${SCRAPER_API_URL}. Please check that the server is deployed and running.`);
    }
    throw error;
  }
}

// ─────────────────────────────────────────────
// TRANSFORM SCRAPER RESPONSE TO SCRAPINGJOB
// ─────────────────────────────────────────────
export function toScrapingJob(status: ScraperJobStatus): {
  $id: string;
  site_id: string;
  status: "pending" | "running" | "completed" | "failed";
  trigger: "manual" | "scheduled" | "agent" | "realtime";
  filters: Record<string, unknown>;
  stats: {
    total_found: number;
    new_listings: number;
    updated: number;
    failed: number;
  };
  started_at: string;
  completed_at: string;
  error_message: string;
  created_by: string;
} {
  return {
    $id: status.jobId,
    site_id: status.jobId,
    status: status.status,
    trigger: status.trigger as "manual" | "scheduled" | "agent" | "realtime",
    filters: status.filters || {},
    stats: status.stats || { total_found: 0, new_listings: 0, updated: 0, failed: 0 },
    started_at: status.started_at || "",
    completed_at: status.completed_at || "",
    error_message: status.error_message || "",
    created_by: status.created_by || "scraper-server",
  };
}