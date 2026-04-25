import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, DATABASE_ID, COLLECTION_SITES, ID, Query, isDemoMode } from "@/lib/appwrite";
import type { ScrapingSite, ScrapeStatus } from "@/types";

// ─────────────────────────────────────────────
// MOCK DATA (Demo Mode)
// ─────────────────────────────────────────────
const mockSites: ScrapingSite[] = [
  {
    $id: "site-immoweb",
    name: "ImmoWeb",
    slug: "immoweb",
    base_url: "https://www.immoweb.be",
    is_active: true,
    rate_limit_ms: 2000,
    properties_count: 487,
    last_scrape_at: "2024-03-20T02:45:00Z",
    last_scrape_status: "success",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    $id: "site-immovlan",
    name: "Immovlan",
    slug: "immovlan",
    base_url: "https://www.immovlan.be",
    is_active: true,
    rate_limit_ms: 2500,
    properties_count: 312,
    last_scrape_at: "2024-03-20T03:30:00Z",
    last_scrape_status: "success",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    $id: "site-zimmo",
    name: "Zimmo",
    slug: "zimmo",
    base_url: "https://www.zimmo.be",
    is_active: true,
    rate_limit_ms: 2000,
    properties_count: 245,
    last_scrape_at: "2024-03-20T10:45:00Z",
    last_scrape_status: "failed",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    $id: "site-immoweb-fr",
    name: "ImmoWeb France",
    slug: "immoweb-fr",
    base_url: "https://www.immoweb.fr",
    is_active: false,
    rate_limit_ms: 3000,
    properties_count: 0,
    last_scrape_at: "",
    last_scrape_status: null,
    created_at: "2024-02-15T00:00:00Z",
  },
];

// ─────────────────────────────────────────────
// FETCH ALL SITES
// ─────────────────────────────────────────────
export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      if (isDemoMode()) {
        return mockSites;
      }

      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_SITES, [
        Query.orderDesc("$createdAt"),
      ]);

      return response.documents as unknown as ScrapingSite[];
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
      if (isDemoMode()) {
        return mockSites.find((s) => s.$id === siteId) || null;
      }

      const response = await databases.getDocument(DATABASE_ID, COLLECTION_SITES, siteId);
      return response as unknown as ScrapingSite;
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
      if (isDemoMode()) {
        const newSite: ScrapingSite = {
          ...site,
          $id: `site-${Date.now()}`,
          properties_count: 0,
          last_scrape_at: "",
          last_scrape_status: null,
          created_at: new Date().toISOString(),
        };
        mockSites.push(newSite);
        return newSite;
      }

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_SITES,
        ID.unique(),
        {
          name: site.name,
          slug: site.slug,
          base_url: site.base_url,
          is_active: site.is_active,
          rate_limit_ms: site.rate_limit_ms,
        }
      );

      return response as unknown as ScrapingSite;
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
      if (isDemoMode()) {
        const index = mockSites.findIndex((s) => s.$id === siteId);
        if (index !== -1) {
          mockSites[index] = { ...mockSites[index], ...data };
          return mockSites[index];
        }
        throw new Error("Site not found");
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_SITES,
        siteId,
        data
      );

      return response as unknown as ScrapingSite;
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
      if (isDemoMode()) {
        const index = mockSites.findIndex((s) => s.$id === siteId);
        if (index !== -1) {
          mockSites.splice(index, 1);
          return { success: true };
        }
        throw new Error("Site not found");
      }

      await databases.deleteDocument(DATABASE_ID, COLLECTION_SITES, siteId);
      return { success: true };
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
      if (isDemoMode()) {
        const site = mockSites.find((s) => s.$id === siteId);
        if (site) {
          site.is_active = isActive;
          return site;
        }
        throw new Error("Site not found");
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_SITES,
        siteId,
        { is_active: isActive }
      );

      return response as unknown as ScrapingSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}