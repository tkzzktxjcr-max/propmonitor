import { useQuery } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_LOGS, Query, logAppwriteError } from "@/lib/appwrite";
import type { ScrapingLog, LogLevel } from "@/types";

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

      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_LOGS,
          queries
        );

        return response.documents as unknown as ScrapingLog[];
      } catch (error) {
        logAppwriteError("useScrapingLogs - listDocuments", error);
        throw error;
      }
    },
    staleTime: 5000,
  });
}

// ─────────────────────────────────────────────
// FETCH LOGS FOR SPECIFIC JOB
// ─────────────────────────────────────────────
export function useJobLogs(jobId: string) {
  return useQuery({
    queryKey: ["job-logs", jobId],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_LOGS, [
          Query.equal("job_id", jobId),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ]);

        return response.documents as unknown as ScrapingLog[];
      } catch (error) {
        logAppwriteError(`useJobLogs - listDocuments(${jobId})`, error);
        throw error;
      }
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
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_LOGS, [
          Query.equal("site_id", siteId),
          Query.orderDesc("$createdAt"),
          Query.limit(limit),
        ]);

        return response.documents as unknown as ScrapingLog[];
      } catch (error) {
        logAppwriteError(`useSiteLogs - listDocuments(${siteId})`, error);
        throw error;
      }
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
      try {
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
      } catch (error) {
        logAppwriteError("useRecentErrors - listDocuments", error);
        throw error;
      }
    },
    staleTime: 30000,
  });
}