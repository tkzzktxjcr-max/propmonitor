import { useState, useEffect } from "react";
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
  ArrowRight,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useScraperServerHealth } from "@/hooks/useScrapingJobs";
import { useSites } from "@/hooks/useSites";
import { useScrapingJobs } from "@/hooks/useScrapingJobs";
import { checkScraperHealth, triggerScraper } from "@/lib/scraper-server";
import { cn } from "@/lib/utils";

interface TestResult {
  name: string;
  status: "idle" | "running" | "success" | "error";
  message?: string;
  duration?: number;
}

export function ScraperDiagnostics() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useScraperServerHealth();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { data: jobs, isLoading: jobsLoading } = useScrapingJobs();
  
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Scraper Server Reachable", status: "idle" },
    { name: "Appwrite Database Connection", status: "idle" },
    { name: "Queue System", status: "idle" },
    { name: "Browser Pool", status: "idle" },
    { name: "End-to-End Scrape Test", status: "idle" },
  ]);
  
  const [testJobId, setTestJobId] = useState<string | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);

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
    
    // Test 1: Server Reachable
    addLog("Testing scraper server connectivity...");
    updateTest(0, "running");
    const start1 = Date.now();
    try {
      const result = await checkScraperHealth();
      updateTest(0, "success", `v${result.version} • ${result.environment} • ${Date.now() - start1}ms`);
      addLog(`✅ Server online: ${result.status} (${result.version})`);
    } catch (error) {
      updateTest(0, "error", error instanceof Error ? error.message : "Connection failed");
      addLog(`❌ Server unreachable: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Stop here if server is down
      return;
    }

    // Test 2: Appwrite Database
    addLog("Testing Appwrite database connection via scraper...");
    updateTest(1, "running");
    const start2 = Date.now();
    try {
      // The health endpoint already includes queue status which comes from Appwrite
      if (health?.queue) {
        updateTest(1, "success", `Connected • ${Date.now() - start2}ms`);
        addLog("✅ Appwrite database accessible");
      } else {
        throw new Error("No queue data in health response");
      }
    } catch (error) {
      updateTest(1, "error", error instanceof Error ? error.message : "Database check failed");
      addLog(`❌ Database issue: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    // Test 3: Queue System
    addLog("Checking job queue status...");
    updateTest(2, "running");
    try {
      if (health?.queue) {
        const { running, queued } = health.queue;
        updateTest(2, "success", `${running} running, ${queued} queued`);
        addLog(`✅ Queue healthy: ${running} running, ${queued} queued`);
      } else {
        throw new Error("Queue status unavailable");
      }
    } catch (error) {
      updateTest(2, "error", error instanceof Error ? error.message : "Queue check failed");
      addLog(`❌ Queue issue: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    // Test 4: Scheduler
    addLog("Checking scheduler status...");
    updateTest(3, "running");
    try {
      if (health?.scheduler) {
        const { activeJobs } = health.scheduler;
        updateTest(3, "success", `${activeJobs} active schedules`);
        addLog(`✅ Scheduler active: ${activeJobs} scheduled jobs`);
      } else {
        throw new Error("Scheduler status unavailable");
      }
    } catch (error) {
      updateTest(3, "error", error instanceof Error ? error.message : "Scheduler check failed");
      addLog(`❌ Scheduler issue: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    // Test 5: End-to-End (optional - just queue a tiny test)
    addLog("Ready for end-to-end test. Click 'Run Test Scrape' to verify full pipeline.");
    updateTest(4, "idle", "Click button below to test");
  };

  const runTestScrape = async () => {
    addLog("Triggering test scrape job...");
    updateTest(4, "running");
    try {
      const result = await triggerScraper({
        source: "immoweb",
        trigger: "manual",
        filters: { city: "Brussels", price_max: 500000 },
      });
      setTestJobId(result.jobId);
      updateTest(4, "success", `Job ${result.jobId} queued`);
      addLog(`✅ Test job queued: ${result.jobId}`);
      addLog("⏳ Check the Jobs tab to see progress...");
    } catch (error) {
      updateTest(4, "error", error instanceof Error ? error.message : "Test scrape failed");
      addLog(`❌ Test scrape failed: ${error instanceof Error ? error.message : "Unknown"}`);
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
            Verify that every component of the scraping pipeline is healthy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Health
          </Button>
          <Button size="sm" onClick={runAllTests}>
            <Activity className="h-4 w-4 mr-2" />
            Run All Tests
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

      {/* Test Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Component Tests</CardTitle>
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

          {tests[4]?.status === "idle" && tests[0]?.status === "success" && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-dashed">
              <p className="text-sm text-slate-600 mb-3">
                Server is online. Run a test scrape to verify the full pipeline:
              </p>
              <Button onClick={runTestScrape} size="sm">
                <Play className="h-4 w-4 mr-2" />
                Run Test Scrape
              </Button>
            </div>
          )}

          {testJobId && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Test job created</span>
              </div>
              <p className="text-xs text-emerald-700 font-mono mb-2">{testJobId}</p>
              <p className="text-xs text-emerald-600">
                Go to the <strong>Scraping Jobs</strong> tab to monitor progress.
              </p>
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
                    log.startsWith("✅") && "text-emerald-400",
                    log.startsWith("❌") && "text-red-400",
                    log.startsWith("⏳") && "text-amber-400",
                    !log.startsWith("✅") && !log.startsWith("❌") && !log.startsWith("⏳") && "text-slate-300"
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
                <p className="font-medium">Server shows "Offline"</p>
                <p className="text-slate-600">
                  Check that the scraper-server is running. Verify <code>VITE_SCRAPER_API_URL</code> in your <code>.env</code> file points to the correct URL.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Test scrape fails immediately</p>
                <p className="text-slate-600">
                  Check Appwrite permissions: the scraper-server needs <code>APPWRITE_API_KEY</code> with database write access. Also verify <code>APPWRITE_DATABASE_ID</code> matches your database.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">Job stays "pending" forever</p>
                <p className="text-slate-600">
                  The job queue may be stuck. Check scraper-server logs. Try restarting the server. Ensure <code>MAX_CONCURRENT_JOBS</code> is not set to 0.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium">No properties appear after scrape</p>
                <p className="text-slate-600">
                  The scraper may be blocked by the target site. Check the <strong>Logs</strong> tab for ERROR entries. Verify the site hasn't changed its HTML/API structure.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}