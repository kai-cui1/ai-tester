import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { projects, type Project } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { Plus, MoreHorizontal, Trash2, Edit, Check } from "lucide-react";
import { toast } from "sonner";

/* ── Environment form helpers ── */
interface EnvFormEntry {
  id: string;
  name: string;
  baseUrl: string;
  variables: { key: string; value: string }[];
}

function createEmptyEnv(): EnvFormEntry {
  return { id: Math.random().toString(36).slice(2), name: "", baseUrl: "", variables: [] };
}

function projectToForm(p: Project): { name: string; description: string; environments: EnvFormEntry[] } {
  return {
    name: p.name,
    description: p.description ?? "",
    environments: p.environments.map((e) => ({
      id: Math.random().toString(36).slice(2),
      name: e.name,
      baseUrl: e.baseUrl,
      variables: Object.entries(e.variables).map(([key, value]) => ({ key, value })),
    })),
  };
}

function formToEnvironments(envs: EnvFormEntry[]) {
  return envs.map((e) => ({
    name: e.name,
    baseUrl: e.baseUrl,
    variables: Object.fromEntries(
      e.variables.filter((v) => v.key.trim()).map((v) => [v.key.trim(), v.value])
    ),
  }));
}

export function ProjectsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { current, setCurrent } = useProject();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; environments: EnvFormEntry[] }>({
    name: "",
    description: "",
    environments: [],
  });

  const load = () => {
    setLoading(true);
    projects.list().then(setList).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      description: form.description,
      environments: formToEnvironments(form.environments),
    };
    try {
      if (editingProject) {
        await projects.update(editingProject.id, payload);
        toast.success(t("projects.updateSuccess"));
      } else {
        await projects.create(payload);
        toast.success(t("projects.createSuccess"));
      }
      setDialogOpen(false);
      setEditingProject(null);
      setForm({ name: "", description: "", environments: [] });
      load();
    } catch (err) {
      toast.error((err as Error).message || t("common.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("projects.confirmDelete"))) return;
    try {
      await projects.delete(id);
      if (current?.id === id) setCurrent(null);
      load();
      toast.success(t("projects.deleteSuccess"));
    } catch (err) {
      toast.error((err as Error).message || t("common.deleteFailed"));
    }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setForm(projectToForm(p));
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm({ name: "", description: "", environments: [] });
    setDialogOpen(true);
  };

  /* ── Environment list helpers ── */
  const addEnv = () => {
    setForm((prev) => ({ ...prev, environments: [...prev.environments, createEmptyEnv()] }));
  };

  const updateEnv = (index: number, patch: Partial<Omit<EnvFormEntry, "id" | "variables">>) => {
    setForm((prev) => {
      const envs = [...prev.environments];
      envs[index] = { ...envs[index], ...patch };
      return { ...prev, environments: envs };
    });
  };

  const removeEnv = (index: number) => {
    setForm((prev) => ({ ...prev, environments: prev.environments.filter((_, i) => i !== index) }));
  };

  const addVariable = (envIndex: number) => {
    setForm((prev) => {
      const envs = [...prev.environments];
      envs[envIndex] = { ...envs[envIndex], variables: [...envs[envIndex].variables, { key: "", value: "" }] };
      return { ...prev, environments: envs };
    });
  };

  const updateVariable = (envIndex: number, varIndex: number, patch: Partial<{ key: string; value: string }>) => {
    setForm((prev) => {
      const envs = [...prev.environments];
      const vars = [...envs[envIndex].variables];
      vars[varIndex] = { ...vars[varIndex], ...patch };
      envs[envIndex] = { ...envs[envIndex], variables: vars };
      return { ...prev, environments: envs };
    });
  };

  const removeVariable = (envIndex: number, varIndex: number) => {
    setForm((prev) => {
      const envs = [...prev.environments];
      envs[envIndex] = {
        ...envs[envIndex],
        variables: envs[envIndex].variables.filter((_, i) => i !== varIndex),
      };
      return { ...prev, environments: envs };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("projects.title")}</h1>
          <p className="text-muted-foreground">{t("projects.subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> {t("projects.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t(editingProject ? "projects.editTitle" : "projects.createTitle")}</DialogTitle>
              <DialogDescription>
                {t(editingProject ? "projects.updateDesc" : "projects.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("projects.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">{t("common.description")}</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("projects.descPlaceholder")}
                />
              </div>

              {/* ── Environment Configuration ── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t("projects.envConfig")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addEnv}>
                    <Plus className="mr-1 h-3 w-3" /> {t("projects.addEnv")}
                  </Button>
                </div>
                {form.environments.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("projects.noEnvironments")}</p>
                )}
                {form.environments.map((env, envIdx) => (
                  <div key={env.id} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("projects.envName")} #{envIdx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => removeEnv(envIdx)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> {t("projects.removeEnv")}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("projects.envName")}</Label>
                      <Input
                        value={env.name}
                        onChange={(e) => updateEnv(envIdx, { name: e.target.value })}
                        placeholder={t("projects.envNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("projects.baseUrl")}</Label>
                      <Input
                        value={env.baseUrl}
                        onChange={(e) => updateEnv(envIdx, { baseUrl: e.target.value })}
                        placeholder={t("projects.baseUrlPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">{t("projects.variables")}</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => addVariable(envIdx)}>
                          <Plus className="mr-1 h-3 w-3" /> {t("projects.addVariable")}
                        </Button>
                      </div>
                      {env.variables.map((v, varIdx) => (
                        <div key={varIdx} className="flex items-center gap-2">
                          <Input
                            className="flex-1"
                            placeholder={t("projects.variableKey")}
                            value={v.key}
                            onChange={(e) => updateVariable(envIdx, varIdx, { key: e.target.value })}
                          />
                          <Input
                            className="flex-1"
                            placeholder={t("projects.variableValue")}
                            value={v.value}
                            onChange={(e) => updateVariable(envIdx, varIdx, { value: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeVariable(envIdx, varIdx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSubmit}>{t(editingProject ? "common.save" : "common.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t("projects.empty")}</p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> {t("projects.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all hover:shadow-md ${current?.id === p.id ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1 cursor-pointer" onClick={() => { setCurrent(p); navigate("/test-cases"); }}>
                  <CardTitle className="text-base flex items-center gap-2">
                    {p.name}
                    {current?.id === p.id && <Check className="h-4 w-4 text-primary" />}
                  </CardTitle>
                  <CardDescription className="mt-1">{p.description || t("common.noDescription")}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(p)}>
                      <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{t("projects.envCount", { count: p.environments.length })}</span>
                  <span>{t("common.updated", { date: new Date(p.updatedAt).toLocaleDateString(i18n.language) })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
