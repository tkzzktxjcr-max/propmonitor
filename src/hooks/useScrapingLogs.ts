import { useQuery } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_LOGS, Query, isDemoMode } from "@/lib/appwrite";
import type { ScrapingLog, LogLevel } from "@/types";

// ─────────────────────────────────────────────
// MOCK DATA (Demo Mode)
// ─────────────────────────────────────────────
const mockLogs: ScrapingLog[] = [
  {
    $id: "log-1",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "INFO",
    message: "Starting scrape for Zimmo with filters: { city: 'Antwerp', price_max: 1000000 }",
    created_at: "2024-03-20T10:00:00Z",
  },
  {
    $id: "log-2",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "INFO",
    message: "Fetching page 1 of results...",
    created_at: "2024-03-20T10:00:15Z",
  },
  {
    $id: "log-3",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "INFO",
    message: "Found 45 listings on page 1",
    created_at: "2024-03-20T10:00:45Z",
  },
  {
    $id: "log-4",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "WARNING",
    message: "Rate limit approaching, slowing down requests",
    created_at: "2024-03-20T10:02:30Z",
  },
  {
    $id: "log-5",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "ERROR",
    message: "Failed to parse listing #23: Invalid price format",
    metadata: { listing_id: "zimmo-12345", error: "Price must be a number" },
    created_at: "2024-03-20T10:05:22Z",
  },
  {
    $id: "log-6",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "INFO",
    message: "Successfully scraped 12 new listings",
    created_at: "2024-03-20T10:10:00Z",
  },
  {
    $id: "log-7",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "INFO",
    message: "Updated 8 existing listings",
    created_at: "2024-03-20T10:10:30Z",
  },
  {
    $id: "log-8",
    job_id: "job-3",
    site_id: "site-zimmo",
    level: "ERROR",
    message: "Connection timeout on page 5. Retrying...",
    metadata: { page: 5, retries: 1 },
    created_at: "2024-03-20T10:15:00Z",
  },
  {
    $id: "log-9",
    job_id: "job-5",
    site_id: "site-immovlan",
    level: "ERROR",
    message: "Rate limit exceeded - IP temporarily blocked",
    created_at: "2024-03-19T02:15:00Z",
  },
  {
    $id: "log-10",
    job_id: "job-1",
    site_id: "site-immoweb",
    level: "INFO",
    message: "Scrape completed successfully. 12 new, 34 updated, 2 failed.",
    created_at: "2024-03-20T02:45:00Z",
  },
];

// ─────────────────────────────────────────────
// FETCH LOGS (All logs, with filters)
// ─────────────────────────────────────────────
export function useScrapingLogs(filters?: {
  job_id?: string;
  site_id?: string;
  level?: LogLevel;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["scraping-logs", filters],
    queryFn: async () => {
      if (isDemoMode()) {
        let filtered = [...mockLogs];

        if (filters?.job_id) {
          filtered = filtered.filter((l) => l.job_id === filters.job_id);
        }
        if (filters?.site_id) {
          filtered = filtered.filter((l) => l.site_id === filters.site_id);
        }
        if (filters?.level) {
          filtered = filtered.filter((l) => l.level === filters.level);
        }

        // Sort by created_at DESC
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Limit
        if (filters?.limit) {
          filtered = filtered.slice(0, filters.limit);
        }

        return filtered;
      }

      const queries: string[] = [Query.orderDesc("$createdAt")];

      if (filters?.job_id) {
        queries.push(Query.equal("job_id", filters.job_id));
      }
      if (filters?.site_id) {
        queries.push(Query.equal("site_id", filters.site_id));
      }
      if (filters?.level) {
        queries.push(Query.equal("level", filters.level));
      }
      if (filters?.limit) {
        queries.push(Query.limit(filters.limit));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_LOGS,
        queries
      );

      return response.documents as unknown as ScrapingLog[];
    },
    staleTime: 5000, // Short stale time for logs - they update frequently
  });
}

// ─────────────────────────────────────────────
// FETCH LOGS FOR SPECIFIC JOB
// ─────────────────────────────────────────────
export function useJobLogs(jobId: string) {
  return useQuery({
    queryKey: ["job-logs", jobId],
    queryFn: async () => {
      if (isDemoMode()) {
        return mockLogs.filter((l) => l.job_id === jobId);
      }

      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_LOGS, [
        Query.equal("job_id", jobId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);

      return response.documents as unknown as ScrapingLog[];
    },
    enabled: !!jobId,
    staleTime: 3000,
  });
}

// ─────────────────────────────────────────────
// FETCH LOGS FOR SPECIFIC SITE
// ─────────────────────────────────────────────
export function useSiteLogs(siteId: string, limit = 50) {
  return useQuery({
    queryKey: ["site-logs", siteId],
    queryFn: async () => {
      if (isDemoMode()) {
        return mockLogs
          .filter((l) => l.site_id === siteId)
          .slice(0, limit);
      }

      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_LOGS, [
        Query.equal("site_id", siteId),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
      ]);

      return response.documents as unknown as ScrapingLog[];
    },
    enabled: !!siteId,
    staleTime: 5000,
  });
}

// ─────────────────────────────────────────────
// GET RECENT ERROR COUNT
// ─────────────────────────────────────────────
export function useRecentErrors(siteId?: string) {
  return useQuery({
    queryKey: ["recent-errors", siteId],
    queryFn: async () => {
      if (isDemoMode()) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let errors = mockLogs.filter(
          (l) =>
            l.level === "ERROR" &&
            new Date(l.created_at) > new Date(oneHourAgo)
        );

        if (siteId) {
          errors = errors.filter((l) => l.site_id === siteId);
        }

        return errors.length;
      }

      const queries: string[] = [
        Query.equal("level", "ERROR"),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ];

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_LOGS,
        queries
      );

      // Filter by time in client (Appwrite doesn't have easy time queries)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentErrors = (response.documents as unknown as ScrapingLog[]).filter(
        (l) =>
          new Date(l.created_at) > oneHourAgo &&
          (!siteId || l.site_id === siteId)
      );

      return recentErrors.length;
    },
    staleTime: 30000,
  });
}