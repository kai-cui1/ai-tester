import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { endpoints, type ApiEndpoint } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { Plus, MoreHorizontal, Trash2, Edit, FileJson, Terminal, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const AUTH_OPTIONS = ["none", "bearer", "api-key", "basic"];

const methodColors: Record<string, string> = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-amber-500",
  PATCH: "bg-orange-500",
  DELETE: "bg-red-500",
};

export function KnowledgePage() {
  const { t } = useTranslation();
  const { current } = useProject();
  const [list, setList] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEndpoint | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [curlOpen, setCurlOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  const load = useCallback(() => {
    if (!current) return;
    setLoading(true);
    endpoints.list(current.id).then(setList).finally(() => setLoading(false));
  }, [current]);

  useEffect(load, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("knowledge.confirmDelete"))) return;
    try {
      await endpoints.delete(id);
      load();
      toast.success(t("knowledge.deleteSuccess"));
    } catch (err) {
      toast.error((err as Error).message || t("common.deleteFailed"));
    }
  };

  if (!current) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.selectProjectFirst")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("knowledge.title")}</h1>
          <p className="text-muted-foreground">{t("knowledge.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTextOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> {t("knowledge.parseText")}
          </Button>
          <Button variant="outline" onClick={() => setCurlOpen(true)}>
            <Terminal className="mr-2 h-4 w-4" /> {t("knowledge.parseCurl")}
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileJson className="mr-2 h-4 w-4" /> {t("knowledge.importOpenApi")}
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {t("knowledge.addEndpoint")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-2">{t("knowledge.empty")}</p>
            <p className="text-sm text-muted-foreground mb-4">{t("knowledge.emptyDesc")}</p>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {t("knowledge.addEndpoint")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">{t("knowledge.table.method")}</TableHead>
                <TableHead>{t("knowledge.table.path")}</TableHead>
                <TableHead>{t("knowledge.table.summary")}</TableHead>
                <TableHead className="w-20">{t("knowledge.table.auth")}</TableHead>
                <TableHead className="w-20">{t("knowledge.table.source")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell>
                    <Badge className={`${methodColors[ep.method] || "bg-gray-500"} text-white text-xs`}>
                      {ep.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{ep.path}</TableCell>
                  <TableCell className="text-sm">{ep.summary}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ep.authentication || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{ep.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(ep); setDialogOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(ep.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EndpointDialog open={dialogOpen} onOpenChange={setDialogOpen} endpoint={editing} projectId={current.id} onSaved={load} />
      <ImportOpenApiDialog open={importOpen} onOpenChange={setImportOpen} projectId={current.id} onSaved={load} />
      <ParseCurlDialog open={curlOpen} onOpenChange={setCurlOpen} projectId={current.id} onSaved={load} />
      <ParseTextDialog open={textOpen} onOpenChange={setTextOpen} projectId={current.id} onSaved={load} />
    </div>
  );
}

/* ── Endpoint Dialog (Manual Create/Edit) ── */
function EndpointDialog({ open, onOpenChange, endpoint, projectId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; endpoint: ApiEndpoint | null; projectId: string; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [authentication, setAuthentication] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (endpoint) {
      setMethod(endpoint.method);
      setPath(endpoint.path);
      setSummary(endpoint.summary);
      setDescription(endpoint.description ?? "");
      setAuthentication(endpoint.authentication ?? "none");
    } else {
      setMethod("GET"); setPath(""); setSummary(""); setDescription(""); setAuthentication("none");
    }
  }, [endpoint, open]);

  const handleSave = async () => {
    if (!path.trim() || !summary.trim()) return;
    setSaving(true);
    try {
      const body = {
        method, path, summary,
        description: description || undefined,
        authentication: (authentication === "none" ? undefined : authentication) as ApiEndpoint["authentication"],
      };
      if (endpoint) {
        await endpoints.update(endpoint.id, body);
        toast.success(t("knowledge.updateSuccess"));
      } else {
        await endpoints.create(projectId, body as any);
        toast.success(t("knowledge.createSuccess"));
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(endpoint ? "knowledge.dialog.editTitle" : "knowledge.dialog.createTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-2">
              <Label>{t("knowledge.dialog.method")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-2">
              <Label>{t("knowledge.dialog.path")}</Label>
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder={t("knowledge.dialog.pathPlaceholder")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("knowledge.dialog.summary")}</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t("knowledge.dialog.summaryPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("knowledge.dialog.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("knowledge.dialog.descPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("knowledge.dialog.authentication")}</Label>
            <Select value={authentication} onValueChange={setAuthentication}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTH_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a === "none" ? t("knowledge.dialog.authNone") : a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !path.trim() || !summary.trim()}>
            {saving ? t("common.saving") : t(endpoint ? "common.save" : "common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Import OpenAPI Dialog ── */
function ImportOpenApiDialog({ open, onOpenChange, projectId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (open) { setContent(""); setMessage(""); } }, [open]);

  const handleImport = async () => {
    if (!content.trim()) return;
    setImporting(true); setMessage("");
    try {
      const result = await endpoints.importOpenApi(projectId, content);
      setMessage(t("knowledge.importDialog.success", { count: result.length }));
      toast.success(t("knowledge.importDialog.success", { count: result.length }));
      onSaved();
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err) {
      setMessage((err as Error).message);
      toast.error((err as Error).message || t("common.importFailed"));
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("knowledge.importDialog.title")}</DialogTitle>
          <DialogDescription>{t("knowledge.importDialog.description")}</DialogDescription>
        </DialogHeader>
        <Textarea
          className="font-mono text-xs min-h-[300px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("knowledge.importDialog.placeholder")}
        />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleImport} disabled={importing || !content.trim()}>
            {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("knowledge.importDialog.importing")}</> : t("knowledge.importDialog.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Parse cURL Dialog ── */
function ParseCurlDialog({ open, onOpenChange, projectId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (open) { setContent(""); setMessage(""); } }, [open]);

  const handleParse = async () => {
    if (!content.trim()) return;
    setParsing(true); setMessage("");
    try {
      const result = await endpoints.importCurl(projectId, content);
      setMessage(t("knowledge.curlDialog.success", { count: result.length }));
      toast.success(t("knowledge.curlDialog.success", { count: result.length }));
      onSaved();
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err) {
      setMessage((err as Error).message);
      toast.error((err as Error).message || t("common.importFailed"));
    } finally { setParsing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("knowledge.curlDialog.title")}</DialogTitle>
          <DialogDescription>{t("knowledge.curlDialog.description")}</DialogDescription>
        </DialogHeader>
        <Textarea
          className="font-mono text-xs min-h-[200px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("knowledge.curlDialog.placeholder")}
        />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleParse} disabled={parsing || !content.trim()}>
            {parsing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("knowledge.curlDialog.parsing")}</> : t("knowledge.curlDialog.parse")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Parse Text (AI) Dialog ── */
function ParseTextDialog({ open, onOpenChange, projectId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<Partial<ApiEndpoint>[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setContent(""); setPreview([]); setSelected(new Set()); } }, [open]);

  const handleParse = async () => {
    if (!content.trim()) return;
    setParsing(true); setPreview([]);
    try {
      const result = await endpoints.parseText(projectId, content);
      setPreview(result);
      setSelected(new Set(result.map((_, i) => i)));
    } catch (err) {
      toast.error((err as Error).message || t("common.parseFailed"));
    } finally { setParsing(false); }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelected(next);
  };

  const handleAdd = async () => {
    const toAdd = preview.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) return;
    setSaving(true);
    try {
      for (const ep of toAdd) {
        await endpoints.create(projectId, ep as any);
      }
      toast.success(t("knowledge.createSuccess"));
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("knowledge.textDialog.title")}</DialogTitle>
          <DialogDescription>{t("knowledge.textDialog.description")}</DialogDescription>
        </DialogHeader>

        {preview.length === 0 ? (
          <>
            <Textarea
              className="min-h-[200px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("knowledge.textDialog.placeholder")}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleParse} disabled={parsing || !content.trim()}>
                {parsing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("knowledge.textDialog.parsing")}</> : t("knowledge.textDialog.parse")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("knowledge.textDialog.preview", { count: preview.length })}</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {preview.map((ep, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded-md">
                  <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleSelect(i)} />
                  <Badge className={`${methodColors[ep.method || "GET"] || "bg-gray-500"} text-white text-xs`}>{ep.method}</Badge>
                  <span className="font-mono text-sm">{ep.path}</span>
                  <span className="text-sm text-muted-foreground truncate flex-1">{ep.summary}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview([])}>{t("aiGenerate.back")}</Button>
              <Button onClick={handleAdd} disabled={saving || selected.size === 0}>
                {saving ? t("common.saving") : t("knowledge.textDialog.addSelected")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
