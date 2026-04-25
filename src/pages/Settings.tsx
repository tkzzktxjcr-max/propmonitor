import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { Save, Database, Bell, Shield, Palette } from "lucide-react";
import type { PropertySource } from "@/types";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  // Form states
  const [appwriteEndpoint, setAppwriteEndpoint] = useState(
    import.meta.env.VITE_APPWRITE_ENDPOINT || ""
  );
  const [appwriteProjectId, setAppwriteProjectId] = useState(
    import.meta.env.VITE_APPWRITE_PROJECT_ID || ""
  );
  const [appwriteDatabaseId, setAppwriteDatabaseId] = useState(
    import.meta.env.VITE_APPWRITE_DATABASE_ID || ""
  );

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobCompletionAlerts, setJobCompletionAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);

  const [defaultMapView, setDefaultMapView] = useState(false);
  const [favoriteSources, setFavoriteSources] = useState<PropertySource[]>([
    "immoweb",
    "immovlan",
    "zimmo",
  ]);

  const sources: { value: PropertySource; label: string }[] = [
    { value: "immoweb", label: "Immoweb" },
    { value: "immovlan", label: "Immovlan" },
    { value: "zimmo", label: "Zimmo" },
  ];

  const toggleSource = (source: PropertySource) => {
    if (favoriteSources.includes(source)) {
      setFavoriteSources(favoriteSources.filter((s) => s !== source));
    } else {
      setFavoriteSources([...favoriteSources, source]);
    }
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
          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-500 mt-1">
                Configure your platform preferences and integrations
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="general" className="gap-2">
                  <Database className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Sources
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <div className="space-y-6">
                  {/* User Profile */}
                  <Card>
                    <CardHeader>
                      <CardTitle>User Profile</CardTitle>
                      <CardDescription>
                        Your account information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input value={user?.name || ""} disabled className="mt-1" />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input value={user?.email || ""} disabled className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label>Role</Label>
                        <div className="mt-1">
                          <Badge className="bg-blue-100 text-blue-800">
                            {user?.role || "viewer"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Appwrite Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Appwrite Configuration</CardTitle>
                      <CardDescription>
                        Connect to your Appwrite instance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Endpoint</Label>
                        <Input
                          value={appwriteEndpoint}
                          onChange={(e) => setAppwriteEndpoint(e.target.value)}
                          placeholder="https://cloud.appwrite.io/v1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Project ID</Label>
                        <Input
                          value={appwriteProjectId}
                          onChange={(e) => setAppwriteProjectId(e.target.value)}
                          placeholder="your-project-id"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Database ID</Label>
                        <Input
                          value={appwriteDatabaseId}
                          onChange={(e) => setAppwriteDatabaseId(e.target.value)}
                          placeholder="real-estate-db"
                          className="mt-1"
                        />
                      </div>
                      <Button>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Configure how you receive alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-slate-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Job Completion Alerts</Label>
                        <p className="text-sm text-slate-500">
                          Get notified when scraping jobs complete
                        </p>
                      </div>
                      <Switch
                        checked={jobCompletionAlerts}
                        onCheckedChange={setJobCompletionAlerts}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Weekly Reports</Label>
                        <p className="text-sm text-slate-500">
                          Receive weekly market summary reports
                        </p>
                      </div>
                      <Switch
                        checked={weeklyReports}
                        onCheckedChange={setWeeklyReports}
                      />
                    </div>
                    
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sources">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Sources</CardTitle>
                    <CardDescription>
                      Select which property sources to include
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Selected sources will be used when scraping new listings
                    </p>
                    <div className="space-y-3">
                      {sources.map((source) => (
                        <div key={source.value} className="flex items-center gap-3">
                          <Checkbox
                            id={source.value}
                            checked={favoriteSources.includes(source.value)}
                            onCheckedChange={() => toggleSource(source.value)}
                          />
                          <Label htmlFor={source.value} className="cursor-pointer">
                            {source.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Source Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Current Password</Label>
                      <Input type="password" className="mt-1" />
                    </div>
                    <div>
                      <Label>New Password</Label>
                      <Input type="password" className="mt-1" />
                    </div>
                    <div>
                      <Label>Confirm New Password</Label>
                      <Input type="password" className="mt-1" />
                    </div>
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </Button>
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
