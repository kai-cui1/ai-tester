import { useEffect, useState, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepEditor, emptyStep, type StepForm } from "@/components/step-editor";
import { PipelineView } from "@/components/pipeline/PipelineView";
import { testCases, type TestCase } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { Plus, MoreHorizontal, Trash2, Edit, Copy, Search } from "lucide-react";
import { toast } from "sonner";

const priorityVariants: Record<string, string> = {
  critical: "destructive",
  high: "warning",
  medium: "default",
  low: "secondary",
};

export function TestCasesPage() {
  const { t } = useTranslation();
  const { current } = useProject();
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);

  const load = useCallback(() => {
    if (!current) return;
    setLoading(true);
    const params: Record<string, string> = { pageSize: "200" };
    if (search) params.search = search;
    testCases.list(current.id, params).then((r) => setCases(r.data)).finally(() => setLoading(false));
  }, [current, search]);

  useEffect(load, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("testCases.confirmDelete"))) return;
    try {
      await testCases.delete(id);
      load();
      toast.success(t("testCases.deleteSuccess"));
    } catch (err) {
      toast.error((err as Error).message || t("common.deleteFailed"));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await testCases.duplicate(id);
      load();
      toast.success(t("testCases.duplicateSuccess"));
    } catch (err) {
      toast.error((err as Error).message || t("common.duplicateFailed"));
    }
  };

  if (!current) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {t("common.selectProjectFirst")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("testCases.title")}</h1>
          <p className="text-muted-foreground">{current.name}</p>
        </div>
        <Button onClick={() => { setEditingCase(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t("testCases.new")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("testCases.searchPlaceholder")}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t("testCases.empty")}</p>
            <Button onClick={() => { setEditingCase(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {t("testCases.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("testCases.table.name")}</TableHead>
                <TableHead>{t("testCases.table.module")}</TableHead>
                <TableHead>{t("testCases.table.priority")}</TableHead>
                <TableHead>{t("testCases.table.steps")}</TableHead>
                <TableHead>{t("testCases.table.tags")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((tc) => (
                <TableRow key={tc.id}>
                  <TableCell>
                    <button
                      className="text-left font-medium hover:text-primary transition-colors"
                      onClick={() => { setEditingCase(tc); setDialogOpen(true); }}
                    >
                      {tc.name}
                    </button>
                    {tc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{tc.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tc.module || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariants[tc.priority] as any}>{t(`testCases.priority.${tc.priority}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{tc.steps.length}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tc.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {tc.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{tc.tags.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCase(tc); setDialogOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(tc.id)}>
                          <Copy className="mr-2 h-4 w-4" /> {t("common.duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tc.id)}>
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

      {/* Create/Edit Dialog */}
      <TestCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testCase={editingCase}
        projectId={current.id}
        onSaved={load}
      />
    </div>
  );
}

/* ── Test Case Create/Edit Dialog ── */

function TestCaseDialog({ open, onOpenChange, testCase, projectId, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  testCase: TestCase | null;
  projectId: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [tagsStr, setTagsStr] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (testCase) {
      setName(testCase.name);
      setDescription(testCase.description ?? "");
      setModule(testCase.module);
      setPriority(testCase.priority);
      setTagsStr(testCase.tags.join(", "));
      setSteps(testCase.steps.map((s) => ({ ...s })));
    } else {
      setName("");
      setDescription("");
      setModule("");
      setPriority("medium");
      setTagsStr("");
      setSteps([]);
    }
  }, [testCase, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    const orderedSteps = steps.map((s, i) => ({ ...s, order: i }));
    const body: any = { name, description, module, priority, tags, steps: orderedSteps };
    try {
      if (testCase) {
        await testCases.update(testCase.id, body);
        toast.success(t("testCases.updateSuccess"));
      } else {
        await testCases.create(projectId, body);
        toast.success(t("testCases.createSuccess"));
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => setSteps([...steps, emptyStep()]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };
  const updateStep = (i: number, patch: Partial<StepForm>) =>
    setSteps(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(testCase ? "testCases.dialog.editTitle" : "testCases.dialog.createTitle")}</DialogTitle>
          <DialogDescription>{t("testCases.dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("common.nameRequired")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Login API Test" />
            </div>
            <div className="space-y-2">
              <Label>{t("testCases.dialog.module")}</Label>
              <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder={t("testCases.dialog.modulePlaceholder")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("testCases.dialog.priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">{t("testCases.priority.critical")}</SelectItem>
                  <SelectItem value="high">{t("testCases.priority.high")}</SelectItem>
                  <SelectItem value="medium">{t("testCases.priority.medium")}</SelectItem>
                  <SelectItem value="low">{t("testCases.priority.low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("testCases.dialog.tags")}</Label>
              <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder={t("testCases.dialog.tagsPlaceholder")} />
            </div>
          </div>

          {/* Steps editor with view toggle */}
          <Tabs defaultValue="form" className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("testCases.steps.label")}</Label>
              <div className="flex items-center gap-2">
                <TabsList className="h-8">
                  <TabsTrigger value="form" className="text-xs px-3 h-6">{t("testCases.pipeline.formView")}</TabsTrigger>
                  <TabsTrigger value="pipeline" className="text-xs px-3 h-6">{t("testCases.pipeline.pipelineView")}</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="form" className="space-y-3 mt-0">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" /> {t("testCases.steps.add")}
                </Button>
              </div>
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("testCases.steps.empty")}</p>
              )}
              {steps.map((step, i) => (
                <StepEditor
                  key={i}
                  index={i}
                  step={step}
                  total={steps.length}
                  projectId={projectId}
                  onChange={(patch) => updateStep(i, patch)}
                  onRemove={() => removeStep(i)}
                  onMove={(dir) => moveStep(i, dir)}
                />
              ))}
            </TabsContent>

            <TabsContent value="pipeline" className="mt-0">
              <PipelineView
                steps={steps}
                projectId={projectId}
                onStepsChange={setSteps}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t("common.saving") : t(testCase ? "testCases.dialog.saveChanges" : "common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


