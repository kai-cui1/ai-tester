import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { suites, runs, testCases, type TestSuite, type TestCase } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { Plus, MoreHorizontal, Trash2, Edit, Play } from "lucide-react";
import { toast } from "sonner";

export function SuitesPage() {
  const { t } = useTranslation();
  const { current } = useProject();
  const navigate = useNavigate();
  const [list, setList] = useState<TestSuite[]>([]);
  const [allCases, setAllCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);
  const [runDialogSuite, setRunDialogSuite] = useState<TestSuite | null>(null);

  const load = useCallback(() => {
    if (!current) return;
    setLoading(true);
    Promise.all([
      suites.list(current.id),
      testCases.list(current.id, { pageSize: "500" }),
    ]).then(([s, tc]) => {
      setList(s);
      setAllCases(tc.data);
    }).finally(() => setLoading(false));
  }, [current]);

  useEffect(load, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("suites.confirmDelete"))) return;
    try {
      await suites.delete(id);
      load();
      toast.success(t("suites.deleteSuccess"));
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
          <h1 className="text-3xl font-bold tracking-tight">{t("suites.title")}</h1>
          <p className="text-muted-foreground">{current.name}</p>
        </div>
        <Button onClick={() => { setEditingSuite(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t("suites.new")}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t("suites.empty")}</p>
            <Button onClick={() => { setEditingSuite(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {t("suites.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("suites.table.name")}</TableHead>
                <TableHead>{t("suites.table.cases")}</TableHead>
                <TableHead>{t("suites.table.environment")}</TableHead>
                <TableHead>{t("suites.table.parallelism")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="font-medium">{s.name}</span>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                  </TableCell>
                  <TableCell>{s.testCaseIds.length}</TableCell>
                  <TableCell>
                    {s.environment ? <Badge variant="outline">{s.environment}</Badge> : "-"}
                  </TableCell>
                  <TableCell>{s.parallelism}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setRunDialogSuite(s)}>
                          <Play className="mr-2 h-4 w-4" /> {t("common.run")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingSuite(s); setDialogOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(s.id)}>
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

      <SuiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        suite={editingSuite}
        projectId={current.id}
        allCases={allCases}
        environments={current.environments}
        onSaved={load}
      />

      <RunSuiteDialog
        suite={runDialogSuite}
        environments={current.environments}
        onClose={() => setRunDialogSuite(null)}
        onTriggered={(runId) => { setRunDialogSuite(null); navigate(`/runs/${runId}`); }}
      />
    </div>
  );
}

/* ── Suite Create/Edit ── */

function SuiteDialog({
  open, onOpenChange, suite, projectId, allCases, environments, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  suite: TestSuite | null;
  projectId: string;
  allCases: TestCase[];
  environments: { name: string }[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [env, setEnv] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (suite) {
      setName(suite.name);
      setDescription(suite.description ?? "");
      setEnv(suite.environment ?? "");
      setSelectedCaseIds(suite.testCaseIds);
    } else {
      setName("");
      setDescription("");
      setEnv("");
      setSelectedCaseIds([]);
    }
  }, [suite, open]);

  const toggleCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const body: any = { name, description, environment: env || undefined, testCaseIds: selectedCaseIds };
    try {
      if (suite) {
        await suites.update(suite.id, body);
        toast.success(t("suites.updateSuccess"));
      } else {
        await suites.create(projectId, body);
        toast.success(t("suites.createSuccess"));
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(suite ? "suites.dialog.editTitle" : "suites.dialog.createTitle")}</DialogTitle>
          <DialogDescription>{t("suites.dialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.nameRequired")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("suites.dialog.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("common.environment")}</Label>
            <Select value={env} onValueChange={setEnv}>
              <SelectTrigger><SelectValue placeholder={t("common.selectEnvironment")} /></SelectTrigger>
              <SelectContent>
                {environments.map((e) => (
                  <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("suites.dialog.testCases", { count: selectedCaseIds.length })}</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
              {allCases.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">{t("suites.dialog.noCases")}</p>}
              {allCases.map((tc) => (
                <label key={tc.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCaseIds.includes(tc.id)}
                    onChange={() => toggleCase(tc.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{tc.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{tc.module}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t("common.saving") : t(suite ? "common.save" : "common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Trigger Run Dialog ── */

function RunSuiteDialog({
  suite, environments, onClose, onTriggered,
}: {
  suite: TestSuite | null;
  environments: { name: string }[];
  onClose: () => void;
  onTriggered: (runId: string) => void;
}) {
  const { t } = useTranslation();
  const [env, setEnv] = useState("");
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (suite) setEnv(suite.environment ?? environments[0]?.name ?? "");
  }, [suite]);

  const handleRun = async () => {
    if (!suite || !env) return;
    setTriggering(true);
    try {
      const run = await runs.trigger({ suiteId: suite.id, environment: env, triggeredBy: "manual" });
      toast.success(t("suites.runTriggered"));
      onTriggered(run.id);
    } catch (err) {
      toast.error((err as Error).message || t("common.runFailed"));
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Dialog open={!!suite} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("suites.runDialog.title")}</DialogTitle>
          <DialogDescription>{t("suites.runDialog.description", { name: suite?.name })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.environment")} *</Label>
            <Select value={env} onValueChange={setEnv}>
              <SelectTrigger><SelectValue placeholder={t("common.selectEnvironment")} /></SelectTrigger>
              <SelectContent>
                {environments.map((e) => (
                  <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleRun} disabled={triggering || !env}>
            {triggering ? t("common.triggering") : t("common.run")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
