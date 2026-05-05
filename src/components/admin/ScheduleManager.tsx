import { useState, useEffect } from "react";
import { 
  Calendar, 
  Play, 
  Trash2, 
  Plus, 
  Clock,
  RefreshCw,
  ChevronDown,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRealtimeSchedules } from "@/hooks/useRealtime";

const SCRAPER_API_URL = import.meta.env.VITE_SCRAPER_API_URL || "http://localhost:3001";

interface Schedule {
  $id: string;
  name: string;
  site_slug: string;
  cron_expression: string;
  filters: Record<string, unknown>;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string;
  created_at: string;
  is_scheduled?: boolean;
}

const CRON_PRESETS = [
  { label: "Daily at 6 AM", value: "0 6 * * *", description: "Every day at 06:00" },
  { label: "Daily at midnight", value: "0 0 * * *", description: "Every day at 00:00" },
  { label: "Every 12 hours", value: "0 */12 * * *", description: "Twice daily" },
  { label: "Every 6 hours", value: "0 */6 * * *", description: "4 times per day" },
  { label: "Weekly (Sunday)", value: "0 6 * * 0", description: "Once a week on Sunday" },
];

const SITES = [
  { value: "immoweb", label: "Immoweb" },
  { value: "immovlan", label: "Immovlan" },
  { value: "zimmo", label: "Zimmo" },
];

export function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formSite, setFormSite] = useState("immoweb");
  const [formCron, setFormCron] = useState("0 6 * * *");
  const [formFilters, setFormFilters] = useState("");
  const [useCustomCron, setUseCustomCron] = useState(false);

  // Enable Realtime subscriptions for schedules
  useRealtimeSchedules();

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SCRAPER_API_URL}/api/schedules`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormSite("immoweb");
    setFormCron("0 6 * * *");
    setFormFilters("");
    setUseCustomCron(false);
    setEditingSchedule(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        site_slug: formSite,
        cron_expression: formCron,
        created_by: "admin",
      };
      
      if (formFilters.trim()) {
        try {
          body.filters = JSON.parse(formFilters);
        } catch {
          console.warn("Invalid filters JSON");
        }
      }

      const response = await fetch(`${SCRAPER_API_URL}/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        resetForm();
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;
    
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        site_slug: formSite,
        cron_expression: formCron,
      };
      
      if (formFilters.trim()) {
        try {
          body.filters = JSON.parse(formFilters);
        } catch {
          console.warn("Invalid filters JSON");
        }
      }

      const response = await fetch(`${SCRAPER_API_URL}/api/schedules/${editingSchedule.$id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        resetForm();
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to update schedule:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (schedule: Schedule) => {
    try {
      const response = await fetch(`${SCRAPER_API_URL}/api/schedules/${schedule.$id}/toggle`, {
        method: "PATCH",
      });
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  const handleTrigger = async (scheduleId: string) => {
    try {
      const response = await fetch(`${SCRAPER_API_URL}/api/schedules/${scheduleId}/trigger`, {
        method: "POST",
      });
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to trigger schedule:", error);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const response = await fetch(`${SCRAPER_API_URL}/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormName(schedule.name);
    setFormSite(schedule.site_slug);
    setFormCron(schedule.cron_expression);
    setFormFilters(schedule.filters ? JSON.stringify(schedule.filters, null, 2) : "");
    
    const isPreset = CRON_PRESETS.some(p => p.value === schedule.cron_expression);
    setUseCustomCron(!isPreset);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getCronDescription = (expression: string) => {
    const preset = CRON_PRESETS.find(p => p.value === expression);
    if (preset) return preset.label;
    
    const parts = expression.split(" ");
    if (parts.length === 5) {
      const [minute, hour] = parts;
      return `Daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }
    return expression;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Scheduled Jobs
          </h3>
          <p className="text-sm text-slate-500">
            Manage automated scraping schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSchedules}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? "Edit Schedule" : "Create New Schedule"}
                </DialogTitle>
                <DialogDescription>
                  {editingSchedule
                    ? "Update the schedule configuration"
                    : "Configure a new automated scraping schedule"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Schedule Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Daily ImmoWeb Scrape"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Source Site</Label>
                  <Select value={formSite} onValueChange={setFormSite}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SITES.map((site) => (
                        <SelectItem key={site.value} value={site.value}>
                          {site.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Frequency</Label>
                  <div className="mt-2 space-y-2">
                    {!useCustomCron && (
                      <div className="grid grid-cols-1 gap-2">
                        {CRON_PRESETS.map((preset) => (
                          <div
                            key={preset.value}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              formCron === preset.value && !useCustomCron
                                ? "border-purple-500 bg-purple-50"
                                : "border-slate-200 hover:border-purple-300"
                            }`}
                            onClick={() => {
                              setFormCron(preset.value);
                              setUseCustomCron(false);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{preset.label}</span>
                                <p className="text-xs text-slate-500">{preset.description}</p>
                              </div>
                              {formCron === preset.value && !useCustomCron && (
                                <Check className="h-4 w-4 text-purple-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={useCustomCron}
                        onCheckedChange={setUseCustomCron}
                        id="custom-cron"
                      />
                      <Label htmlFor="custom-cron" className="text-sm cursor-pointer">
                        Use custom cron expression
                      </Label>
                    </div>

                    {useCustomCron && (
                      <div>
                        <Input
                          placeholder="* * * * *"
                          value={formCron}
                          onChange={(e) => setFormCron(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Format: minute hour day month weekday
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="filters">Filters (JSON, optional)</Label>
                  <Textarea
                    id="filters"
                    placeholder='{"city": "Brussels", "price_max": 500000}'
                    value={formFilters}
                    onChange={(e) => setFormFilters(e.target.value)}
                    className="mt-1 font-mono text-sm h-20"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => resetForm()}>
                  Cancel
                </Button>
                <Button
                  onClick={editingSchedule ? handleUpdate : handleCreate}
                  disabled={!formName.trim() || isCreating}
                >
                  {isCreating ? "Saving..." : editingSchedule ? "Update Schedule" : "Create Schedule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Schedule List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Calendar className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">No schedules configured</p>
              <p className="text-sm text-slate-400 mt-1">
                Create a schedule to automate your scraping tasks
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.$id}>
                    <TableCell>
                      <div className="font-medium">{schedule.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {schedule.site_slug}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {getCronDescription(schedule.cron_expression)}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {schedule.cron_expression}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggle(schedule)}
                        />
                        <Badge
                          variant={schedule.is_active ? "default" : "secondary"}
                          className={schedule.is_active ? "bg-emerald-100 text-emerald-800" : ""}
                        >
                          {schedule.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(schedule.last_run_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.is_active && schedule.next_run_at ? (
                        <span className="text-purple-600">
                          {formatDate(schedule.next_run_at)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTrigger(schedule.$id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Run Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(schedule.$id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cron Expression Reference */}
      <Card className="bg-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cron Expression Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            {CRON_PRESETS.map((preset) => (
              <div key={preset.value} className="p-2 bg-white rounded border">
                <div className="font-medium text-xs">{preset.label}</div>
                <code className="text-xs text-slate-500">{preset.value}</code>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Format: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-6)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}