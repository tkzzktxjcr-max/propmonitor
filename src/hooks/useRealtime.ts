import { useEffect, useRef, useState, useCallback } from "react";
import { client } from "@/lib/appwrite";
import { useQueryClient } from "@tanstack/react-query";

interface UseRealtimeOptions {
  channels: string[];
  enabled?: boolean;
}

export function useRealtime({ channels, enabled = true }: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || channels.length === 0) return;

    let mounted = true;

    try {
      const unsubscribe = client.subscribe(channels, () => {
        // Connection confirmed
      });

      if (mounted) {
        unsubscribeRef.current = unsubscribe;
        setIsConnected(true);
      }
    } catch (error) {
      console.error("[useRealtime] Subscription failed:", error);
      if (mounted) setIsConnected(false);
    }

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [channels.join(","), enabled]);

  return { isConnected };
}

export function useRealtimeJobs(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = client.subscribe(
        `databases.*.collections.scraping_jobs.documents`,
        (event: { events: string[] }) => {
          if (event.events?.some((e: string) => e.includes("create") || e.includes("update") || e.includes("delete"))) {
            queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["scraping-job"] });
          }
        }
      );
    } catch (error) {
      console.error("[useRealtimeJobs] Subscription failed:", error);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enabled, queryClient]);
}

export function useRealtimeProperties(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = client.subscribe(
        `databases.*.collections.properties.documents`,
        (event: { events: string[] }) => {
          if (event.events?.some((e: string) => e.includes("create") || e.includes("update") || e.includes("delete"))) {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["analytics-from-db"] });
          }
        }
      );
    } catch (error) {
      console.error("[useRealtimeProperties] Subscription failed:", error);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enabled, queryClient]);
}

export function useRealtimeLogs(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = client.subscribe(
        `databases.*.collections.scraping_logs.documents`,
        (event: { events: string[] }) => {
          if (event.events?.some((e: string) => e.includes("create"))) {
            queryClient.invalidateQueries({ queryKey: ["scraping-logs"] });
            queryClient.invalidateQueries({ queryKey: ["job-logs"] });
            queryClient.invalidateQueries({ queryKey: ["site-logs"] });
            queryClient.invalidateQueries({ queryKey: ["recent-errors"] });
          }
        }
      );
    } catch (error) {
      console.error("[useRealtimeLogs] Subscription failed:", error);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enabled, queryClient]);
}

export function useRealtimeSchedules(enabled = true) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = client.subscribe(
        `databases.*.collections.schedules.documents`,
        (event: { events: string[] }) => {
          if (event.events?.some((e: string) => e.includes("create") || e.includes("update") || e.includes("delete"))) {
            invalidate();
          }
        }
      );
    } catch (error) {
      console.error("[useRealtimeSchedules] Subscription failed:", error);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enabled, invalidate]);
}