import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { baselines, type BaselineImage } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { Upload, Trash2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

export function BaselinesPage() {
  const { t } = useTranslation();
  const { current } = useProject();
  const [list, setList] = useState<BaselineImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!current) return;
    setLoading(true);
    baselines.list(current.id).then(setList).finally(() => setLoading(false));
  }, [current]);

  useEffect(load, [load]);

  /* ── Upload logic ── */
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!current || !selectedFile) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      const name = selectedFile.name;
      await baselines.upload(current.id, name, dataUrl);
      toast.success(t("baselines.uploadSuccess"));
      setUploadDialogOpen(false);
      setSelectedFile(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!current) return;
    if (!confirm(t("baselines.confirmDelete"))) return;
    try {
      await baselines.delete(current.id, name);
      toast.success(t("baselines.deleteSuccess"));
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  /* ── Drag & drop ── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  /* ── Preview ── */
  const openPreview = (item: BaselineImage) => {
    if (!current) return;
    setPreviewName(item.name);
    setPreviewImage(`/api/v1/baselines/${current.id}/${item.name}`);
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
          <h1 className="text-3xl font-bold tracking-tight">{t("baselines.title")}</h1>
          <p className="text-muted-foreground">{t("baselines.subtitle")}</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <Button
            onClick={() => {
              setSelectedFile(null);
              setUploadDialogOpen(true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> {t("baselines.upload")}
          </Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("baselines.upload")}</DialogTitle>
              <DialogDescription>{t("baselines.uploadHint")}</DialogDescription>
            </DialogHeader>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="mx-auto max-h-40 rounded border"
                  />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="mr-1 h-3 w-3" /> Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("baselines.uploadHint")}</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Browse Files
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? t("common.saving") : t("baselines.upload")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t("baselines.empty")}</p>
            <Button
              onClick={() => {
                setSelectedFile(null);
                setUploadDialogOpen(true);
              }}
            >
              <Upload className="mr-2 h-4 w-4" /> {t("baselines.uploadFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((item) => (
            <Card key={item.name} className="group overflow-hidden">
              <div
                className="relative cursor-pointer bg-muted/30"
                onClick={() => openPreview(item)}
              >
                <img
                  src={`/api/v1/baselines/${current.id}/${item.name}`}
                  alt={item.name}
                  className="h-40 w-full object-contain p-2"
                />
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(item.size / 1024).toFixed(1)} KB ·{" "}
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(item.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="overflow-auto max-h-[70vh]">
              <img
                src={previewImage}
                alt={previewName}
                className="w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Helper ── */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
