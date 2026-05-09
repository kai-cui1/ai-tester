import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  endpoints as endpointsApi,
  aiGeneration,
  type ApiEndpoint,
  type GenerationTask,
  type GeneratedTestCasePreview,
} from "@/lib/api";
import { useProject } from "@/lib/project-context";
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Sparkles, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const methodColors: Record<string, string> = {
  GET: "bg-blue-500", POST: "bg-green-500", PUT: "bg-amber-500",
  PATCH: "bg-orange-500", DELETE: "bg-red-500",
};

const STRATEGIES = ["happy_path", "error_cases", "auth_cases", "comprehensive"] as const;

export function AiGeneratePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { current } = useProject();
  const [step, setStep] = useState(1);

  // Step 1
  const [allEndpoints, setAllEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingEndpoints, setLoadingEndpoints] = useState(true);

  // Step 2
  const [strategy, setStrategy] = useState<string>("comprehensive");
  const [customPrompt, setCustomPrompt] = useState("");

  // Step 3
  const [generating, setGenerating] = useState(false);
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!current) return;
    setLoadingEndpoints(true);
    endpointsApi.list(current.id).then(setAllEndpoints).finally(() => setLoadingEndpoints(false));
  }, [current]);

  useEffect(load, [load]);

  const toggleEndpoint = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === allEndpoints.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(allEndpoints.map((e) => e.id)));
  };

  const handleGenerate = async () => {
    if (!current) return;
    setGenerating(true);
    setError("");
    setTask(null);
    try {
      const result = await aiGeneration.generate(current.id, {
        endpointIds: Array.from(selectedIds),
        strategy,
        customPrompt: customPrompt.trim() || undefined,
      });
      setTask(result);
      setSelectedCases(new Set(result.generatedCases.map((_, i) => i)));
      setStep(3);
      toast.success(t("aiGenerate.generateSuccess"));
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message || t("common.generateFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!task) return;
    setConfirming(true);
    try {
      await aiGeneration.confirm(task.id, Array.from(selectedCases));
      setConfirmed(true);
      toast.success(t("aiGenerate.confirmSuccess"));
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message || t("common.saveFailed"));
    } finally {
      setConfirming(false);
    }
  };

  const toggleCase = (idx: number) => {
    const next = new Set(selectedCases);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelectedCases(next);
  };

  if (!current) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.selectProjectFirst")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("aiGenerate.title")}</h1>
        <p className="text-muted-foreground">{t("aiGenerate.subtitle")}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
              step === s ? "bg-primary text-primary-foreground" :
              step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span className={cn("text-sm", step === s ? "font-medium" : "text-muted-foreground")}>
              {t(`aiGenerate.step${s}.title`)}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Endpoints */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("aiGenerate.step1.title")}</CardTitle>
            <CardDescription>{t("aiGenerate.step1.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEndpoints ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">{t("common.loading")}</div>
            ) : allEndpoints.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t("aiGenerate.step1.noEndpoints")}</p>
                <Button variant="outline" onClick={() => navigate("/ai/knowledge")}>
                  <ArrowRight className="mr-2 h-4 w-4" /> {t("sidebar.nav.knowledge")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedIds.size === allEndpoints.length ? t("aiGenerate.step1.deselectAll") : t("aiGenerate.step1.selectAll")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t("aiGenerate.step1.selected", { count: selectedIds.size })}
                  </span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {allEndpoints.map((ep) => (
                    <div
                      key={ep.id}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors",
                        selectedIds.has(ep.id) ? "border-primary bg-primary/5" : "hover:bg-accent"
                      )}
                      onClick={() => toggleEndpoint(ep.id)}
                    >
                      <Checkbox checked={selectedIds.has(ep.id)} />
                      <Badge className={`${methodColors[ep.method] || "bg-gray-500"} text-white text-xs`}>{ep.method}</Badge>
                      <span className="font-mono text-sm">{ep.path}</span>
                      <span className="text-sm text-muted-foreground truncate flex-1">{ep.summary}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(2)} disabled={selectedIds.size === 0}>
                    {t("aiGenerate.next")} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Choose Strategy */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("aiGenerate.step2.title")}</CardTitle>
            <CardDescription>{t("aiGenerate.step2.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {STRATEGIES.map((s) => (
                <div
                  key={s}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-colors",
                    strategy === s ? "border-primary bg-primary/5" : "hover:bg-accent"
                  )}
                  onClick={() => setStrategy(s)}
                >
                  <p className="font-medium">{t(`aiGenerate.strategies.${s}`)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t(`aiGenerate.strategies.${s}_desc`)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>{t("aiGenerate.step2.customPrompt")}</Label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t("aiGenerate.step2.customPromptPlaceholder")}
                className="min-h-[80px]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> {t("aiGenerate.back")}
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("aiGenerate.generating")}</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> {t("aiGenerate.generate")}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Confirm */}
      {step === 3 && task && (
        <Card>
          <CardHeader>
            <CardTitle>{t("aiGenerate.step3.title")}</CardTitle>
            <CardDescription>
              {t("aiGenerate.step3.description")}
              {task.durationMs && <span className="ml-2 text-xs">({t("aiGenerate.duration", { ms: task.durationMs })})</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {confirmed ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-lg font-medium">{t("aiGenerate.confirmSuccess", { count: selectedCases.size })}</p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => navigate("/test-cases")}>
                    {t("aiGenerate.viewTestCases")}
                  </Button>
                  <Button variant="outline" onClick={() => { setStep(1); setTask(null); setConfirmed(false); setSelectedCases(new Set()); }}>
                    {t("aiGenerate.generateMore")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {task.generatedCases.map((tc, i) => (
                    <CasePreviewCard
                      key={i}
                      index={i}
                      testCase={tc}
                      selected={selectedCases.has(i)}
                      onToggle={() => toggleCase(i)}
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => { setStep(2); setTask(null); }}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> {t("aiGenerate.back")}
                  </Button>
                  <Button onClick={handleConfirm} disabled={confirming || selectedCases.size === 0}>
                    {confirming ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("common.saving")}</>
                    ) : (
                      t("aiGenerate.confirmSelected", { count: selectedCases.size })
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Case Preview Card ── */
function CasePreviewCard({ index, testCase, selected, onToggle }: {
  index: number; testCase: GeneratedTestCasePreview; selected: boolean; onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "border rounded-md transition-colors",
      selected ? "border-primary bg-primary/5" : ""
    )}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <Checkbox checked={selected} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{testCase.name}</span>
            <Badge variant="outline" className="text-xs">{testCase.priority}</Badge>
            {testCase.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          {testCase.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{testCase.description}</p>
          )}
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? "Collapse" : `${testCase.steps.length} steps`}
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-1 bg-muted/30">
          {testCase.reasoning && (
            <p className="text-xs text-muted-foreground italic mb-2">{testCase.reasoning}</p>
          )}
          {testCase.steps.map((s, si) => (
            <div key={si} className="flex items-center gap-2 text-xs py-1">
              <span className="text-muted-foreground w-4">{si + 1}.</span>
              <Badge variant="outline" className="text-xs">{s.type}</Badge>
              <span className="truncate">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
