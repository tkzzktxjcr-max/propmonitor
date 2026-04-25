import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { JobList, ScrapeTrigger } from "@/components/admin";
import { SiteManager } from "@/components/admin/SiteManager";
import { ScrapingLogs } from "@/components/admin/ScrapingLogs";
import { useScrapingJobs, useTriggerScrape, useCancelJob } from "@/hooks/useScrapingJobs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Shield, Activity, Settings, Globe, FileText } from "lucide-react";

export default function Admin() {
  const { data: jobs, isLoading } = useScrapingJobs();
  const triggerScrape = useTriggerScrape();
  const cancelJob = useCancelJob();
  const [activeTab, setActiveTab] = useState("jobs");

  const runningJobs = jobs?.filter((j) => j.status === "running") || [];
  const pendingJobs = jobs?.filter((j) => j.status === "pending") || [];
  const completedJobs = jobs?.filter((j) => j.status === "completed") || [];
  const failedJobs = jobs?.filter((j) => j.status === "failed") || [];

  const handleTriggerScrape = (params: Parameters<typeof triggerScrape.mutate>[0]) => {
    triggerScrape.mutate(params);
  };

  const handleCancelJob = (jobId: string) => {
    cancelJob.mutate(jobId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 border-r bg-white min-h-[calc(100vh-4rem)]">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
                <Badge className="bg-blue-100 text-blue-800">Admin Access</Badge>
              </div>
              <p className="text-slate-500">
                Manage scrapers, sites, monitor jobs, and configure the platform
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{runningJobs.length}</p>
                      <p className="text-sm text-slate-500">Running</p>
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
                      <p className="text-2xl font-bold">{pendingJobs.length}</p>
                      <p className="text-sm text-slate-500">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{completedJobs.length}</p>
                      <p className="text-sm text-slate-500">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{failedJobs.length}</p>
                      <p className="text-sm text-slate-500">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="jobs" className="gap-2">
                  <Database className="h-4 w-4" />
                  Scraping Jobs
                </TabsTrigger>
                <TabsTrigger value="sites" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Sites
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Logs
                </TabsTrigger>
                <TabsTrigger value="trigger" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Trigger Scrape
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* ───────────────────────────────────────────── */}
              {/* TAB: SCRAPING JOBS */}
              {/* ───────────────────────────────────────────── */}
              <TabsContent value="jobs">
                <Card>
                  <CardHeader>
                    <CardTitle>Scraping Jobs History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobList
                      jobs={jobs || []}
                      isLoading={isLoading}
                      onCancelJob={handleCancelJob}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ───────────────────────────────────────────── */}
              {/* TAB: SITES */}
              {/* ───────────────────────────────────────────── */}
              <TabsContent value="sites">
                <SiteManager />
              </TabsContent>

              {/* ───────────────────────────────────────────── */}
              {/* TAB: LOGS */}
              {/* ───────────────────────────────────────────── */}
              <TabsContent value="logs">
                <ScrapingLogs />
              </TabsContent>

              {/* ───────────────────────────────────────────── */}
              {/* TAB: TRIGGER SCRAPE */}
              {/* ───────────────────────────────────────────── */}
              <TabsContent value="trigger">
                <div className="grid md:grid-cols-2 gap-6">
                  <ScrapeTrigger
                    onTrigger={handleTriggerScrape}
                    isLoading={triggerScrape.isPending}
                  />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Hermes Agent Integration</h4>
                        <p className="text-sm text-slate-600 mb-3">
                          Use the Hermes Agent to automatically manage scraping tasks based on market conditions.
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>AI-powered job scheduling</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Automatic rate limiting</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Smart duplicate detection</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Scheduled Scraping</h4>
                        <p className="text-sm text-slate-600 mb-3">
                          Configure automatic daily scrapes for all configured sources.
                        </p>
                        <div className="text-sm text-slate-500">
                          Next scheduled run: Tomorrow at 02:00 AM
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────── */}
              {/* TAB: SETTINGS */}
              {/* ───────────────────────────────────────────── */}
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Data Retention</h4>
                      <p className="text-sm text-slate-600 mb-3">
                        Configure how long scraped data is kept in the system.
                      </p>
                      <div className="text-sm">
                        <span className="text-slate-500">Current policy:</span>{" "}
                        <span className="font-medium">Keep active listings indefinitely, archive after 6 months of inactivity</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Rate Limiting</h4>
                      <p className="text-sm text-slate-600 mb-3">
                        Control scraping speed to avoid IP blocks.
                      </p>
                      <div className="text-sm">
                        <span className="text-slate-500">Current delay:</span>{" "}
                        <span className="font-medium">2 seconds between requests</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Notification Settings</h4>
                      <p className="text-sm text-slate-600 mb-3">
                        Configure alerts for scraping events.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div>✓ Email on job completion</div>
                        <div>✓ Email on job failure</div>
                        <div>✓ Weekly summary reports</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}