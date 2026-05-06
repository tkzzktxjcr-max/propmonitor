// ...existing imports...
// Add to the ScrapeTestResult interface:
interface ScrapeTestResult {
  source: string;
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
  diagnostic?: {
    tip: string;
    screenshot: string;
  };
  error?: string;
}

// In the render where scrapeTest is shown, add after the error display:
{scrapeTest.diagnostic && (
  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
    <p className="font-medium text-amber-800 mb-1">💡 {scrapeTest.diagnostic.tip}</p>
    <p className="text-amber-700 text-xs">Screenshot saved on server: {scrapeTest.diagnostic.screenshot}</p>
  </div>
)}