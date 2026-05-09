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
import { aiModel, aiProvider, type AiModel, type AiProviderConfig } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import {
  Save, Trash2, Wifi, Loader2, Plus, Pencil, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// Provider list loaded from server dynamically
let providerOptionsCache: { value: string; label: string }[] = [];
async function loadProviderOptions() {
  if (providerOptionsCache.length > 0) return providerOptionsCache;
  const list = await aiProvider.list();
  providerOptionsCache = list.map((p) => ({ value: p.key, label: p.name }));
  return providerOptionsCache;
}

const API_FORMAT_OPTIONS = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "anthropic", label: "Anthropic-compatible" },
];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
  custom: [],
};

export function AiSettingsPage() {
  const { t } = useTranslation();
  const { current } = useProject();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<AiModel[]>([]);
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; durationMs: number; logs: string[] } | null>(null);
    const [showTestLogs, setShowTestLogs] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<string>("openai");
  const [apiFormat, setApiFormat] = useState<string>("openai");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);

  const load = useCallback(() => {
    if (!current) return;
    setLoading(true);
    Promise.all([
      aiModel.list(current.id),
      aiModel.active(current.id),
      loadProviderOptions().then((opts) => aiProvider.list().then(setProviders)),
    ]).then(([list, active]) => {
      setModels(list);
      setActiveModelId(active?.id ?? null);
    }).finally(() => setLoading(false));
  }, [current]);

  useEffect(load, [load]);

  const resetForm = () => {
    setName("");
    setProvider("openai");
    setApiFormat("openai");
    setModelName("");
    setApiKey("");
    setBaseUrl("");
    setTemperature(0.7);
    setMaxTokens(4096);
    setEditingModel(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (m: AiModel) => {
    setEditingModel(m);
    setName(m.name);
    setProvider(m.provider);
    setApiFormat(m.apiFormat);
    setModelName(m.model);
    setApiKey("");
    setBaseUrl(m.baseUrl ?? "");
    setTemperature(m.temperature);
    setMaxTokens(m.maxTokens);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!current || !name.trim() || !modelName.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        provider: provider as AiModel["provider"],
        apiFormat: apiFormat as AiModel["apiFormat"],
        model: modelName.trim(),
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || null,
        temperature,
        maxTokens,
      };
      if (editingModel) {
        await aiModel.update(editingModel.id, body);
        toast.success(t("aiSettings.updateSuccess"));
      } else {
        await aiModel.create(current.id, body);
        toast.success(t("aiSettings.createSuccess"));
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
    if (!confirm(t("aiSettings.confirmDeleteModel"))) return;
    try {
      await aiModel.delete(id);
      toast.success(t("aiSettings.deleteSuccess"));
      load();
    } catch (err) {
      toast.error((err as Error).message || t("common.deleteFailed"));
    }
  };

  const handleSetActive = async (id: string) => {
    if (!current) return;
    try {
      await aiModel.setActive(current.id, id);
      setActiveModelId(id);
      toast.success(t("aiSettings.setActiveSuccess"));
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await aiModel.test(id);
      setTestResult({ id, ...result });
      if (result.success) {
        toast.success(`${result.message} (${result.durationMs}ms)`);
      } else {
        toast.error(`${result.message} (${result.durationMs}ms)`);
      }
    } catch (err) {
      const msg = (err as Error).message;
      setTestResult({ id, success: false, message: msg, durationMs: 0, logs: [`[Error] ${msg}`] });
      toast.error(msg);
    } finally {
      setTestingId(null);
    }
  };

  if (!current) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.selectProjectFirst")}</div>;
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("aiSettings.title")}</h1>
          <p className="text-muted-foreground">{t("aiSettings.subtitle")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> {t("aiSettings.addModel")}
        </Button>
      </div>

      {models.length === 0 ? (
        <Card className="max-w-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{t("aiSettings.noModels")}</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> {t("aiSettings.addModel")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {models.map((m) => {
            const isActive = m.id === activeModelId;
            const isTesting = testingId === m.id;
            const testRes = testResult?.id === m.id ? testResult : null;
            return (
              <Card key={m.id} className={isActive ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{m.name}</CardTitle>
                      {isActive && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {t("aiSettings.active")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => handleSetActive(m.id)}>
                          {t("aiSettings.setActive")}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleTest(m.id)} disabled={isTesting}>
                        {isTesting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wifi className="mr-1 h-3 w-3" />}
                        {t("aiSettings.testConnection")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{providers.find((p) => p.key === m.provider)?.name ?? m.provider}</Badge>
                    <Badge variant="outline">{API_FORMAT_OPTIONS.find((f) => f.value === m.apiFormat)?.label ?? m.apiFormat}</Badge>
                    <span className="text-muted-foreground">{m.model}</span>
                    {m.maskedApiKey && <span className="text-muted-foreground">· {m.maskedApiKey}</span>}
                  </div>
                  {testRes && (
                    <div className="space-y-1">
                      <p className={`text-sm ${testRes.success ? "text-green-600" : "text-destructive"}`}>
                        {testRes.success ? t("aiSettings.testSuccess") : `${t("aiSettings.testFailed")}: ${testRes.message}`}
                        <span className="text-muted-foreground"> ({testRes.durationMs}ms)</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto px-1 py-0 text-xs"
                          onClick={() => setShowTestLogs(showTestLogs === m.id ? null : m.id)}
                        >
                          {showTestLogs === m.id ? t("aiSettings.hideLogs") : t("aiSettings.viewLogs")}
                        </Button>
                      </p>
                      {showTestLogs === m.id && (
                        <div className="rounded-md bg-muted p-2 text-xs font-mono leading-relaxed">
                          {testRes.logs.map((log, i) => (
                            <div key={i} className={log.startsWith('[Error]') ? 'text-destructive' : 'text-muted-foreground'}>
                              {log}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? t("aiSettings.editModel") : t("aiSettings.addModel")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("aiSettings.modelName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("aiSettings.modelNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("aiSettings.provider")}</Label>
              <Select value={provider} onValueChange={(v) => { setProvider(v); setModelName(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t("aiSettings.providerPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>{opt.name}</SelectItem>
                  ))}
                  {providers.length === 0 && (
                    <SelectItem value="__empty__" disabled>{t("aiSettings.noProviders")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
              <p className="text-xs text-muted-foreground">{t("aiSettings.apiFormatHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("aiSettings.model")}</Label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={t("aiSettings.modelPlaceholder")}
                list="model-suggestions"
              />
              <datalist id="model-suggestions">
                {(MODEL_SUGGESTIONS[provider] || []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>{t("aiSettings.apiKey")}</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={editingModel ? t("aiSettings.apiKeyUpdatePlaceholder") : t("aiSettings.apiKeyPlaceholder")}
              />
              {editingModel?.maskedApiKey && (
                <p className="text-xs text-muted-foreground">
                  {t("aiSettings.currentKey")}: {editingModel.maskedApiKey}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("aiSettings.baseUrl")}</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t("aiSettings.baseUrlPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("aiSettings.baseUrlHint")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("aiSettings.temperature")}</Label>
                <Input
                  type="number"
                  min={0} max={2} step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("aiSettings.maxTokens")}</Label>
                <Input
                  type="number"
                  min={100} max={128000} step={100}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !modelName.trim() || (!editingModel && !apiKey.trim())}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
