import { useState, useEffect } from "react";
import { 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Image,
  Bug,
  Globe,
  RefreshCw,
  Server,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { testScraper, checkScraperHealth } from "@/lib/scraper-server";
import { showSuccess, showError } from "@/utils/toast";

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

const SOURCES = [
  { value: "immoweb", label: "Immoweb", url: "https://www.immoweb.be" },
  { value: "immovlan", label: "Immovlan", url: "https://www.immovlan.be" },
  { value: "zimmo", label: "Zimmo", url: "https://www.zimmo.be" },
];

export function ScraperDiagnostics() {
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, ScrapeTestResult>>({});
  const [serverHealth, setServerHealth] = useState<{
    status: "checking" | "online" | "offline";
    message?: string;
    version?: string;
  }>({ status: "checking" });

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setServerHealth({ status: "checking" });
    try {
      const health = await checkScraperHealth();
      setServerHealth({
        status: "online",
        message: `Server v${health.version} - Uptime: ${Math.floor(health.uptime / 60)}m`,
        version: health.version,
      });
    } catch (error) {
      setServerHealth({
        status: "offline",
        message: error instanceof Error ? error.message : "Server unreachable",
      });
    }
  };

  const runTest = async (source: string) => {
    if (serverHealth.status === "offline") {
      showError("Scraper server is offline. Please check deployment.");
      return;
    }

    setIsTesting(prev => ({ ...prev, [source]: true }));
    
    try {
      const response = await testScraper(source);
      
      const result: ScrapeTestResult = {
        source,
        searchUrl: response.searchUrl,
        listingsFound: response.listingsFound,
        sampleListings: response.sampleListings,
        detailSample: response.detailSample,
        screenshotPath: response.screenshotPath,
        diagnostic: response.diagnostic,
        error: response.error,
      };
      
      setResults(prev => ({ ...prev, [source]: result }));
      
      if (response.listingsFound > 0) {
        showSuccess(`${source}: ${response.listingsFound} listings found`);
      } else {
        showError(`${source}: 0 listings found - check diagnostics`);
      }
    } catch (error) {
      const result: ScrapeTestResult = {
        source,
        searchUrl: "",
        listingsFound: 0,
        sampleListings: [],
        detailSample: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      setResults(prev => ({ ...prev, [source]: result }));
      showError(`${source} test failed: ${result.error}`);
    } finally {
      setIsTesting(prev => ({ ...prev, [source]: false }));
    }
  };

  const runAllTests = async () => {
    if (serverHealth.status === "offline") {
      showError("Cannot run tests - scraper server is offline");
      return;
    }
    for (const source of SOURCES) {
      await runTest(source.value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Health */}
      <Card className={serverHealth.status === "online" ? "border-emerald-200 bg-emerald-50/30" : serverHealth.status === "offline" ? "border-red-200 bg-red-50/30" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {serverHealth.status === "checking" ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : serverHealth.status === "online" ? (
                <Server className="h-5 w-5 text-emerald-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  Scraper Server: {serverHealth.status === "checking" ? "Checking..." : serverHealth.status === "online" ? "Online" : "Offline"}
                </p>
                {serverHealth.message && (
                  <p className="text-sm text-slate-500">{serverHealth.message}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={checkHealth} disabled={serverHealth.status === "checking"}>
              <RefreshCw className={`h-4 w-4 mr-2 ${serverHealth.status === "checking" ? "animate-spin" : ""}`} />
              Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600" />
            Scraper Diagnostics
          </h3>
          <p className="text-sm text-slate-500">
            Test scrapers and diagnose extraction issues
          </p>
        </div>
        <Button 
          onClick={runAllTests} 
          variant="outline"
          disabled={serverHealth.status === "offline" || serverHealth.status === "checking"}
        >
          <Play className="h-4 w-4 mr-2" />
          Test All Sources
        </Button>
      </div>

      {/* Source Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {SOURCES.map((source) => {
          const result = results[source.value];
          const isLoading = isTesting[source.value];

          return (
            <Card key={source.value} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    {source.label}
                  </CardTitle>
                  {result && (
                    <Badge 
                      variant={result.listingsFound > 0 ? "default" : "destructive"}
                      className={result.listingsFound > 0 ? "bg-emerald-100 text-emerald-800" : ""}
                    >
                      {result.listingsFound > 0 ? `${result.listingsFound} found` : "Failed"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => runTest(source.value)} 
                  disabled={isLoading || serverHealth.status === "offline"}
                  className="w-full"
                  variant={result ? "outline" : "default"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : result ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retest
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Test {source.label}
                    </>
                  )}
                </Button>

                {result && (
                  <div className="space-y-3 text-sm">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {result.listingsFound > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={result.listingsFound > 0 ? "text-emerald-700" : "text-red-700"}>
                        {result.listingsFound > 0 
                          ? `Successfully extracted ${result.listingsFound} listings` 
                          : "Extraction failed"}
                      </span>
                    </div>

                    {/* Search URL */}
                    {result.searchUrl && (
                      <div className="p-2 bg-slate-50 rounded text-xs break-all">
                        <span className="text-slate-500">URL:</span>{" "}
                        <a 
                          href={result.searchUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {result.searchUrl}
                        </a>
                      </div>
                    )}

                    {/* Sample Listings */}
                    {result.sampleListings.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-xs text-slate-500 uppercase">Sample Listings</p>
                        {result.sampleListings.slice(0, 2).map((listing, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded border">
                            <p className="font-medium truncate">{listing.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                              <span>€{listing.price.toLocaleString()}</span>
                              {listing.city && <span>{listing.city}</span>}
                              <span className="text-slate-400">ID: {listing.source_id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detail Sample */}
                    {result.detailSample && Object.keys(result.detailSample).length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-slate-500 uppercase mb-1">Detail Sample</p>
                        <pre className="p-2 bg-slate-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.detailSample, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error */}
                    {result.error && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                        <p className="font-medium mb-1">Error:</p>
                        {result.error}
                      </div>
                    )}

                    {/* Diagnostic */}
                    {result.diagnostic && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-medium text-amber-800 mb-1 text-xs">💡 {result.diagnostic.tip}</p>
                        <p className="text-amber-700 text-xs">
                          Screenshot saved on server: {result.diagnostic.screenshot}
                        </p>
                      </div>
                    )}

                    {/* Screenshot */}
                    {result.screenshotPath && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Image className="h-3 w-3" />
                        <span>Screenshot: {result.screenshotPath}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Troubleshooting Tips
          </h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• If the server shows "Offline", check that the scraper server is deployed and running</li>
            <li>• If 0 listings are found, the site may be blocking headless browsers</li>
            <li>• Check the screenshot path on the server to see what the bot sees</li>
            <li>• Cookie consent banners can interfere with extraction</li>
            <li>• Sites may require residential proxies for heavy scraping</li>
            <li>• The scraper uses Playwright with stealth plugins to avoid detection</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}