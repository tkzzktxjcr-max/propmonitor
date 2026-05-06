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