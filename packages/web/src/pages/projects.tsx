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

export function ProjectsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { current, setCurrent } = useProject();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = () => {
    setLoading(true);
    projects.list().then(setList).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingProject) {
        await projects.update(editingProject.id, form);
        toast.success(t("projects.updateSuccess"));
      } else {
        await projects.create(form);
        toast.success(t("projects.createSuccess"));
      }
      setDialogOpen(false);
      setEditingProject(null);
      setForm({ name: "", description: "" });
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
    setForm({ name: p.name, description: p.description ?? "" });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(editingProject ? "projects.editTitle" : "projects.createTitle")}</DialogTitle>
              <DialogDescription>
                {t(editingProject ? "projects.updateDesc" : "projects.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
