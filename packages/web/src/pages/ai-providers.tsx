import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { aiProvider, type AiProviderConfig } from "@/lib/api";
import { Save, Trash2, Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_FORMAT_OPTIONS = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "anthropic", label: "Anthropic-compatible" },
];

export function AiProvidersPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiProviderConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiFormat, setApiFormat] = useState<string>("openai");
  const [description, setDescription] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    aiProvider.list()
      .then(setProviders)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName("");
    setKey("");
    setBaseUrl("");
    setApiFormat("openai");
    setDescription("");
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: AiProviderConfig) => {
    setEditing(p);
    setName(p.name);
    setKey(p.key);
    setBaseUrl(p.baseUrl ?? "");
    setApiFormat(p.apiFormat);
    setDescription(p.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !key.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        key: key.trim(),
        baseUrl: baseUrl.trim() || null,
        apiFormat: apiFormat as AiProviderConfig["apiFormat"],
        description: description.trim() || null,
      };
      if (editing) {
        await aiProvider.update(editing.id, body);
        toast.success(t("aiProviders.updateSuccess"));
      } else {
        await aiProvider.create(body);
        toast.success(t("aiProviders.createSuccess"));
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("aiProviders.confirmDelete"))) return;
    try {
      await aiProvider.delete(id);
      toast.success(t("aiProviders.deleteSuccess"));
      load();
    } catch (err) {
      toast.error((err as Error).message || t("common.deleteFailed"));
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("aiProviders.title")}</h1>
          <p className="text-muted-foreground">{t("aiProviders.subtitle")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> {t("aiProviders.addProvider")}
        </Button>
      </div>

      {providers.length === 0 ? (
        <Card className="max-w-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{t("aiProviders.noProviders")}</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> {t("aiProviders.addProvider")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant="secondary">{p.key}</Badge>
                    <Badge variant="outline">
                      {API_FORMAT_OPTIONS.find((f) => f.value === p.apiFormat)?.label ?? p.apiFormat}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {p.baseUrl && <p className="text-sm text-muted-foreground">{p.baseUrl}</p>}
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("aiProviders.editProvider") : t("aiProviders.addProvider")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("aiProviders.providerName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("aiProviders.providerNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("aiProviders.providerKey")}</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t("aiProviders.providerKeyPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("aiProviders.providerKeyHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("aiSettings.apiFormat")}</Label>
              <Select value={apiFormat} onValueChange={setApiFormat}>
                <SelectTrigger>
                  <SelectValue placeholder={t("aiSettings.apiFormatPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {API_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("aiSettings.baseUrl")}</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t("aiSettings.baseUrlPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("aiProviders.baseUrlHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("aiProviders.description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("aiProviders.descriptionPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !key.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
