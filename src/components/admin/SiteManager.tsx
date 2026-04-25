import { useState } from "react";
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from "@/hooks/useSites";
import { useRecentErrors } from "@/hooks/useScrapingLogs";
import type { ScrapingSite } from "@/types";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// SITE EDITOR DIALOG
// ─────────────────────────────────────────────
interface SiteEditorProps {
  site?: ScrapingSite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SiteEditor({ site, open, onOpenChange }: SiteEditorProps) {
  const [formData, setFormData] = useState({
    name: site?.name || "",
    slug: site?.slug || "",
    base_url: site?.base_url || "",
    rate_limit_ms: site?.rate_limit_ms || 2000,
    is_active: site?.is_active ?? true,
  });

  const createSite = useCreateSite();
  const updateSite = useUpdateSite();

  const isEditing = !!site;
  const isLoading = createSite.isPending || updateSite.isPending;

  const handleSubmit = async () => {
    if (isEditing && site) {
      await updateSite.mutateAsync({
        siteId: site.$id,
        data: formData,
      });
    } else {
      await createSite.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  const handleSlugAuto = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData({ ...formData, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Site" : "Add New Site"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Site Name</Label>
            <Input
              id="name"
              placeholder="e.g., ImmoWeb Belgium"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">Slug (unique ID)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSlugAuto}
                className="h-7 text-xs"
              >
                Auto-generate
              </Button>
            </div>
            <Input
              id="slug"
              placeholder="e.g., immoweb"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
            />
            <p className="text-xs text-slate-500">
              Used as technical identifier, must be unique
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              id="base_url"
              placeholder="https://www.immoweb.be"
              value={formData.base_url}
              onChange={(e) =>
                setFormData({ ...formData, base_url: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate_limit">Rate Limit (ms)</Label>
            <Input
              id="rate_limit"
              type="number"
              placeholder="2000"
              value={formData.rate_limit_ms}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rate_limit_ms: parseInt(e.target.value) || 2000,
                })
              }
            />
            <p className="text-xs text-slate-500">
              Delay between requests in milliseconds. 2000 = 2 seconds
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Active Status</Label>
              <p className="text-xs text-slate-500">
                Include this site in scheduled scrapes
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name || !formData.slug}>
            {isLoading ? "Saving..." : isEditing ? "Update Site" : "Create Site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// SINGLE SITE CARD
// ─────────────────────────────────────────────
interface SiteCardProps {
  site: ScrapingSite;
  onEdit: (site: ScrapingSite) => void;
  onDelete: (site: ScrapingSite) => void;
}

function SiteCard({ site, onEdit, onDelete }: SiteCardProps) {
  const { data: errorCount } = useRecentErrors(site.$id);
  const toggleActive = useUpdateSite();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const handleToggleActive = () => {
    toggleActive.mutate({
      siteId: site.$id,
      data: { is_active: !site.is_active },
    });
  };

  return (
    <Card
      className={cn(
        "transition-all",
        !site.is_active && "opacity-60 bg-slate-50"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                site.is_active ? "bg-blue-100" : "bg-slate-100"
              )}
            >
              <Globe
                className={cn(
                  "h-5 w-5",
                  site.is_active ? "text-blue-600" : "text-slate-400"
                )}
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{site.name}</h3>
              <p className="text-sm text-slate-500">{site.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={site.is_active}
              onCheckedChange={handleToggleActive}
              disabled={toggleActive.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(site)}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(site)}
              className="h-8 w-8 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4 text-slate-400" />
            <a
              href={site.base_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              {site.base_url}
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <div>
              <p className="text-xs text-slate-500 mb-1">Properties</p>
              <p className="font-semibold">{site.properties_count.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Rate Limit</p>
              <p className="font-semibold">{site.rate_limit_ms}ms</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Errors (1h)</p>
              <p className={cn(
                "font-semibold",
                errorCount && errorCount > 0 ? "text-red-600" : "text-emerald-600"
              )}>
                {errorCount || 0}
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {site.last_scrape_status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : site.last_scrape_status === "failed" ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-slate-400" />
              )}
              <span className="text-slate-600">
                {site.last_scrape_status || "Not scraped"}
              </span>
            </div>
            <span className="text-slate-500">
              {formatDate(site.last_scrape_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// MAIN SITE MANAGER
// ─────────────────────────────────────────────
export function SiteManager() {
  const { data: sites, isLoading } = useSites();
  const deleteSite = useDeleteSite();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ScrapingSite | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<ScrapingSite | null>(null);

  const handleEdit = (site: ScrapingSite) => {
    setEditingSite(site);
    setEditorOpen(true);
  };

  const handleAddNew = () => {
    setEditingSite(null);
    setEditorOpen(true);
  };

  const handleDelete = (site: ScrapingSite) => {
    setSiteToDelete(site);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (siteToDelete) {
      deleteSite.mutate(siteToDelete.$id);
    }
    setDeleteConfirmOpen(false);
    setSiteToDelete(null);
  };

  const activeSites = sites?.filter((s) => s.is_active) || [];
  const inactiveSites = sites?.filter((s) => !s.is_active) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Scraping Sites</h2>
            <p className="text-sm text-slate-500">
              {activeSites.length} active sites, {inactiveSites.length} inactive
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </Button>
        </div>

        {activeSites.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Active Sites
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {activeSites.map((site) => (
                <SiteCard
                  key={site.$id}
                  site={site}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {inactiveSites.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Inactive Sites
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveSites.map((site) => (
                <SiteCard
                  key={site.$id}
                  site={site}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {sites?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-1">No sites configured</h3>
              <p className="text-sm text-slate-500 mb-4">
                Add your first scraping site to get started
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Site
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <SiteEditor
        site={editingSite}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{siteToDelete?.name}"? This will
              not delete existing scraped properties. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}