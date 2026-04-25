import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScrapingJob, JobStatus, PropertySource } from "@/types";

// Mock data for scraping jobs
const mockJobs: ScrapingJob[] = [
  {
    $id: "job-1",
    source: "immoweb",
    status: "completed",
    trigger: "scheduled",
    filters: { city: "Brussels", price_max: 500000, type: "apartment" },
    stats: { total_found: 245, new_listings: 12, updated: 34, failed: 2 },
    started_at: "2024-03-20T02:00:00Z",
    completed_at: "2024-03-20T02:45:00Z",
    error_message: "",
    created_by: "system"
  },
  {
    $id: "job-2",
    source: "immovlan",
    status: "completed",
    trigger: "scheduled",
    filters: { province: "East Flanders", type: "house" },
    stats: { total_found: 189, new_listings: 8, updated: 21, failed: 0 },
    started_at: "2024-03-20T03:00:00Z",
    completed_at: "2024-03-20T03:30:00Z",
    error_message: "",
    created_by: "system"
  },
  {
    $id: "job-3",
    source: "zimmo",
    status: "running",
    trigger: "agent",
    filters: { city: "Antwerp", price_max: 1000000 },
    stats: { total_found: 156, new_listings: 4, updated: 12, failed: 1 },
    started_at: "2024-03-20T10:00:00Z",
    completed_at: "",
    error_message: "",
    created_by: "hermes-agent"
  },
  {
    $id: "job-4",
    source: "immoweb",
    status: "pending",
    trigger: "manual",
    filters: { city: "Ghent", type: "apartment" },
    stats: { total_found: 0, new_listings: 0, updated: 0, failed: 0 },
    started_at: "",
    completed_at: "",
    error_message: "",
    created_by: "admin@realestate.be"
  },
  {
    $id: "job-5",
    source: "immovlan",
    status: "failed",
    trigger: "scheduled",
    filters: { province: "Liège" },
    stats: { total_found: 45, new_listings: 2, updated: 5, failed: 40 },
    started_at: "2024-03-19T02:00:00Z",
    completed_at: "2024-03-19T02:15:00Z",
    error_message: "Rate limit exceeded - IP temporarily blocked",
    created_by: "system"
  }
];

export function useScrapingJobs() {
  return useQuery({
    queryKey: ["scraping-jobs"],
    queryFn: async () => {
      // In production, this would call Appwrite
      return mockJobs;
    },
    staleTime: 10000,
  });
}

export function useScrapingJob(id: string) {
  return useQuery({
    queryKey: ["scraping-job", id],
    queryFn: async () => {
      // In production, this would call Appwrite
      return mockJobs.find(j => j.$id === id) || null;
    },
    enabled: !!id,
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      source: PropertySource;
      trigger: "manual" | "agent";
      filters?: ScrapingJob["filters"];
    }) => {
      // In production, this would call Appwrite Function
      console.log("Triggering scrape:", params);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        $id: `job-${Date.now()}`,
        source: params.source,
        status: "pending" as JobStatus,
        trigger: params.trigger,
        filters: params.filters || {},
        stats: { total_found: 0, new_listings: 0, updated: 0, failed: 0 },
        started_at: "",
        completed_at: "",
        error_message: "",
        created_by: params.trigger === "agent" ? "hermes-agent" : "admin@realestate.be"
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (jobId: string) => {
      // In production, this would call Appwrite Function
      console.log("Canceling job:", jobId);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping-jobs"] });
    },
  });
}
