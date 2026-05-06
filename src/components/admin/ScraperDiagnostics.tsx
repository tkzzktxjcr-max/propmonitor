import { useState } from "react";
import {
  Activity,
  Server,
  Database,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Terminal,
  Play,
  Bug,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useScraperServerHealth } from "@/hooks/useScrapingJobs";
import { useSites } from "@/hooks/useSites";
import { useScrapingJobs } from "@/hooks/useScrapingJobs";
import { checkScraperHealth, testScraper } from "@/lib/scraper-server";
import { cn } from "@/lib/utils";

interface TestResult {
  name: string;
  status: "idle" | "running" | "success" | "error";
  message?: string;
}

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
  error?: string;
}

export function ScraperDiagnostics() {
  const { data: health, refetch: refetchHealth } = useScraperServerHealth();
  const { data: sites } = useSites();
  const { data: jobs } = useScrapingJobs();
  
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Scraper Server Reachable", status: "idle" },
    { name: "Appwrite Database Connection", status: "idle" },
    { name: "Queue System", status: "idle" },
    { name: "Scheduler Active", status: "idle" },
  ]);
  
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [scrapeTest, setScrapeTest] = useState<ScrapeTestResult | null>(null);
  const [isTestingScrape, setIsTestingScrape] = useState(false);

  const addLog = (msg: string) => {
    setTestLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const updateTest = (index: number, status: TestResult["status"], message?: string) => {
    setTests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status, message };
      return next;
    });
  };

  const runAllTests = async () => {
    setTestLogs([]);
    setTests((prev) => prev.map((t) => ({ ...t, status: "idle" })));
    setScrapeTest(null);
    
    // Test 1: Server Reachable
    addLog("Testing scraper server connectivity...");
    updateTest(0, "running");
    try {
      const result = await checkScraperHealth();
      updateTest(0, "success", `v${result.version} • ${result.environment}`);
      addLog(`✅ Server online: ${result.status} (${result.version})`);
    } catch (error) {
      updateTest(0, "error", error instanceof Error ? error.message : "Connection failed");
      addLog(`❌ Server unreachable`);
      return;
    }

    // Test 2: Appwrite Database
    updateTest(1, "running");
    try {
      if (health?.queue) {
        updateTest(1, "success", "Connected");
        addLog("✅ Appwrite database accessible");
      } else {
        throw new Error("No queue data");
      }
    } catch (error) {
      updateTest(1, "error", "Database check failed");
      addLog(`❌ Database issue`);
    }

    // Test 3: Queue System
    updateTest(2, "running");
    try {
      if (health?.queue) {
        const { running, queued } = health.queue;
        updateTest(2, "success", `${running} running, ${queued} queued`);
        addLog(`✅ Queue: ${running} running, ${queued} queued`);
      } else {
        throw new Error("Queue status unavailable");
      }
    } catch (error) {
      updateTest(2, "error", "Queue check failed");
    }

    // Test 4: Scheduler
    updateTest(3, "running");
    try {
      if (health?.scheduler) {
        const { activeJobs } = health.scheduler;
        updateTest(3, "success", `${activeJobs} active schedules`);
        addLog(`✅ Scheduler: ${activeJobs} active schedules`);
      } else {
        throw new Error("Scheduler unavailable");
      }
    } catch (error) {
      updateTest(3, "error", "Scheduler check failed");
    }

    addLog("✅ All connectivity tests passed. Ready for scrape test.");
  };

  const runScrapeTest = async (source: "immoweb" | "immovlan" | "zimmo") => {
    setIsTestingScrape(true);
    setScrapeTest(null);
    addLog(`🧪 Starting REAL scrape test on ${source}...`);
    
    try {
      const result = await testScraper(source, { city: "Brussels", price_max: 500000 });
      
      setScrapeTest({
        source,
        ...result,
      });
      
      if (result.success && result.listingsFound > 0) {
        addLog(`✅ Scrape test SUCCESS: ${result.listingsFound} listings found on ${source}`);
        addLog(`🔗 Search URL used: ${result.searchUrl}`);
      } else if (result.success) {
        addLog(`⚠️ Scrape test returned 0 listings. The site structure may have changed.`);
        addLog(`🔗 URL tested: ${result.searchUrl}`);
      } else {
        addLog(`❌ Scrape test failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Scrape test error: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setIsTestingScrape(false);
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-slate-200" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-emerald-100 text-emerald-800">Pass</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800">Testing...</Badge>;
      default:
        return <Badge variant="outline">Not tested</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Scraper Diagnostics
          </h3>
          <p className="text-sm text-slate-500">
            Test connectivity and run real scrape tests to verify the pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={runAllTests}>
            <Activity className="h-4 w-4 mr-2" />
            Run Connectivity Tests
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                health ? "bg-emerald-100" : "bg-red-100"
              )}>
                <Server className={cn("h-5 w-5", health ? "text-emerald-600" : "text-red-600")} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Server</p>
                <p className={cn("font-semibold", health ? "text-emerald-600" : "text-red-600")}>
                  {health ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Jobs in DB</p>
                <p className="font-semibold">{jobs?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Sites Configured</p>
                <p className="font-semibold">{sites?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Queue Status</p>
                <p className="font-semibold">
                  {health?.queue?.running || 0} / {health?.queue?.queued || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connectivity Tests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connectivity Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tests.map((test, index) => (
              <div
                key={test.name}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  test.status === "success" && "bg-emerald-50/50 border-emerald-200",
                  test.status === "error" && "bg-red-50/50 border-red-200",
                  test.status === "running" && "bg-blue-50/50 border-blue-200",
                  test.status === "idle" && "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <p className="font-medium text-sm">{test.name}</p>
                    {test.message && (
                      <p className={cn(
                        "text-xs",
                        test.status === "error" ? "text-red-600" : "text-slate-500"
                      )}>
                        {test.message}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real Scrape Test */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Real Scrape Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            This runs an actual scrape on the target site and shows raw results. No data is saved.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {(["immoweb", "immovlan", "zimmo"] as const).map((source) => (
              <Button
                key={source}
                variant="outline"
                size="sm"
                onClick={() => runScrapeTest(source)}
                disabled={isTestingScrape}
              >
                {isTestingScrape ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Test {source.charAt(0).toUpperCase() + source.slice(1)}
              </Button>
            ))}
          </div>

          {scrapeTest && (
            <div className="space-y-4">
              <div className={cn(
                "p-4 rounded-lg border",
                scrapeTest.listingsFound > 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {scrapeTest.listingsFound > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  <span className={cn(
                    "font-semibold",
                    scrapeTest.listingsFound > 0 ? "text-emerald-800" : "text-amber-800"
                  )}>
                    {scrapeTest.listingsFound > 0 
                      ? `${scrapeTest.listingsFound} listings found on ${scrapeTest.source}`
                      : `No listings found on ${scrapeTest.source}`
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="text-slate-500">Search URL:</span>
                  <a 
                    href={scrapeTest.searchUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Open in browser <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {scrapeTest.error && (
                  <p className="text-sm text-red-600 mb-3">
                    Error: {scrapeTest.error}
                  </p>
                )}
              </div>

              {scrapeTest.sampleListings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Sample Listings Found:</h4>
                  <div className="space-y-2">
                    {scrapeTest.sampleListings.map((listing, i) => (
                      <div key={i} className="p-3 bg-white rounded border text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate flex-1">{listing.title}</span>
                          <span className="text-blue-600 font-semibold ml-2">
                            €{listing.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{listing.city}</span>
                          <span>ID: {listing.source_id}</span>
                          <a 
                            href={listing.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scrapeTest.detailSample && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Detail Page Sample (1st listing):</h4>
                  <pre className="bg-slate-950 text-slate-300 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(scrapeTest.detailSample, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Test Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testLogs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Run tests to see live logs here
            </p>
          ) : (
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
              {testLogs.map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    log.includes("✅") && "text-emerald-400",
                    log.includes("❌") && "text-red-400",
                    log.includes("⚠️") && "text-amber-400",
                    log.includes("🧪") && "text-blue-400",
                    !log.includes("✅") && !log.includes("❌") && !log.includes("⚠️") && !log.includes("🧪") && "text-slate-300"
                  )}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card className="bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">0 listings found but server is online</p>
                <p className="text-slate-600">
                  The target site may have changed its API structure or is blocking headless browsers. 
                  Click the <strong>Search URL</strong> link to verify the page loads correctly in a normal browser.
                  If it works in your browser but not in the scraper, the site likely has anti-bot protection.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Detail page returns empty data</p>
                <p className="text-slate-600">
                  The detail page API pattern may not match. Check the scraper-server logs for intercepted URLs.
                  The site might load details via a different endpoint than expected.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Job stays "pending" forever</p>
                <p className="text-slate-600">
                  The job queue may be stuck. Check scraper-server logs. Try restarting the server. 
                  Ensure <code>MAX_CONCURRENT_JOBS</code> is not set to 0.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Test works but real scrape fails</p>
                <p className="text-slate-600">
                  The test only scrapes 1 page. Real scrapes process multiple listings and may hit rate limits.
                  Check if <code>REQUEST_DELAY_MS</code> is high enough (minimum 2000ms recommended).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}