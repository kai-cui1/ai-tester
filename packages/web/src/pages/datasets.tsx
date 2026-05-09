import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { datasets, type TestDataSet } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { Plus, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export function DatasetsPage() {
  const { t, i18n } = useTranslation();
  const { current } = useProject();
  const [list, setList] = useState<TestDataSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDs, setEditingDs] = useState<TestDataSet | null>(null);

  const load = useCallback(() => {
    if (!current) return;
    setLoading(true);
    datasets.list(current.id).then(setList).finally(() => setLoading(false));
  }, [current]);

  useEffect(load, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("datasets.confirmDelete"))) return;
    try {
      await datasets.delete(id);
      load();
      toast.success(t("datasets.deleteSuccess"));
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
          <h1 className="text-3xl font-bold tracking-tight">{t("datasets.title")}</h1>
          <p className="text-muted-foreground">{current.name}</p>
        </div>
        <Button onClick={() => { setEditingDs(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t("datasets.new")}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">{t("common.loading")}</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t("datasets.empty")}</p>
            <Button onClick={() => { setEditingDs(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {t("datasets.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("datasets.table.name")}</TableHead>
                <TableHead>{t("datasets.table.fields")}</TableHead>
                <TableHead>{t("datasets.table.rows")}</TableHead>
                <TableHead>{t("datasets.table.updated")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell>
                    <span className="font-medium">{ds.name}</span>
                    {ds.description && <p className="text-xs text-muted-foreground mt-0.5">{ds.description}</p>}
                  </TableCell>
                  <TableCell>{ds.fields.length}</TableCell>
                  <TableCell>{ds.rows.length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(ds.updatedAt).toLocaleDateString(i18n.language)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingDs(ds); setDialogOpen(true); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(ds.id)}>
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

      <DatasetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dataset={editingDs}
        projectId={current.id}
        onSaved={load}
      />
    </div>
  );
}

function DatasetDialog({
  open, onOpenChange, dataset, projectId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dataset: TestDataSet | null;
  projectId: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jsonData, setJsonData] = useState("");
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (dataset) {
      setName(dataset.name);
      setDescription(dataset.description ?? "");
      setJsonData(JSON.stringify({ fields: dataset.fields, rows: dataset.rows }, null, 2));
    } else {
      setName("");
      setDescription("");
      setJsonData(JSON.stringify({ fields: [{ name: "username", type: "string" }], rows: [{ username: "user1" }] }, null, 2));
    }
    setJsonError("");
  }, [dataset, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
      setJsonError("");
    } catch {
      setJsonError(t("datasets.dialog.invalidJson"));
      return;
    }
    setSaving(true);
    try {
      const body: any = { name, description, fields: parsed.fields ?? [], rows: parsed.rows ?? [] };
      if (dataset) {
        await datasets.update(dataset.id, body);
        toast.success(t("datasets.updateSuccess"));
      } else {
        await datasets.create(projectId, body);
        toast.success(t("datasets.createSuccess"));
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
          <DialogTitle>{t(dataset ? "datasets.dialog.editTitle" : "datasets.dialog.createTitle")}</DialogTitle>
          <DialogDescription>{t("datasets.dialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.nameRequired")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("datasets.dialog.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("datasets.dialog.dataLabel")}</Label>
            <Textarea
              className="font-mono text-xs min-h-[200px]"
              value={jsonData}
              onChange={(e) => { setJsonData(e.target.value); setJsonError(""); }}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t("common.saving") : t(dataset ? "common.save" : "common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
