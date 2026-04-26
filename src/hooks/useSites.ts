import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_SITES, ID, Query, logAppwriteError } from "@/lib/appwrite";
import type { ScrapingSite, ScrapeStatus } from "@/types";

// ─────────────────────────────────────────────
// FETCH ALL SITES
// ─────────────────────────────────────────────
export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_SITES, [
          Query.orderDesc("$createdAt"),
        ]);

        return response.documents as unknown as ScrapingSite[];
      } catch (error) {
        logAppwriteError("useSites - listDocuments", error);
        throw error;
      }
    },
    staleTime: 30000,
  });
}

// ─────────────────────────────────────────────
// FETCH SINGLE SITE
// ─────────────────────────────────────────────
export function useSite(siteId: string) {
  return useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      try {
        const response = await databases.getDocument(DATABASE_ID, COLLECTION_SITES, siteId);
        return response as unknown as ScrapingSite;
      } catch (error) {
        logAppwriteError(`useSite - getDocument(${siteId})`, error);
        throw error;
      }
    },
    enabled: !!siteId,
  });
}

// ─────────────────────────────────────────────
// CREATE SITE
// ─────────────────────────────────────────────
export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (site: Omit<ScrapingSite, "$id" | "created_at" | "properties_count" | "last_scrape_at" | "last_scrape_status">) => {
      const documentData = {
        name: site.name,
        slug: site.slug,
        base_url: site.base_url,
        is_active: site.is_active,
        rate_limit_ms: site.rate_limit_ms,
      };

      try {
        const response = await databases.createDocument(
          DATABASE_ID,
          COLLECTION_SITES,
          ID.unique(),
          documentData
        );

        return response as unknown as ScrapingSite;
      } catch (error) {
        logAppwriteError("useCreateSite - createDocument", error, documentData);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

// ─────────────────────────────────────────────
// UPDATE SITE
// ─────────────────────────────────────────────
export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      siteId,
      data,
    }: {
      siteId: string;
      data: Partial<ScrapingSite>;
    }) => {
      try {
        const response = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_SITES,
          siteId,
          data
        );

        return response as unknown as ScrapingSite;
      } catch (error) {
        logAppwriteError(`useUpdateSite - updateDocument(${siteId})`, error, data);
        throw error;
      }
    },
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["site", siteId] });
    },
  });
}

// ─────────────────────────────────────────────
// DELETE SITE
// ─────────────────────────────────────────────
export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siteId: string) => {
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_SITES, siteId);
        return { success: true };
      } catch (error) {
        logAppwriteError(`useDeleteSite - deleteDocument(${siteId})`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

// ─────────────────────────────────────────────
// TOGGLE SITE ACTIVE
// ─────────────────────────────────────────────
export function useToggleSiteActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ siteId, isActive }: { siteId: string; isActive: boolean }) => {
      try {
        const response = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_SITES,
          siteId,
          { is_active: isActive }
        );

        return response as unknown as ScrapingSite;
      } catch (error) {
        logAppwriteError(`useToggleSiteActive - updateDocument(${siteId})`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}