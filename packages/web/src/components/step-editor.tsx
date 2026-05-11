import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { testCases, datasets as datasetsApi, type TestCase, type TestDataSet } from "@/lib/api";
import { BrowserStepEditor } from "@/components/features/browser-step-editor";
import { GripVertical, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

/* ── Types & Constants ── */

export interface StepForm {
  id?: string;
  name: string;
  type: "http" | "assertion" | "extract" | "call" | "load-dataset" | "browser";
  config: Record<string, any>;
  continueOnFailure: boolean;
  retryCount: number;
}

export function emptyStep(): StepForm {
  return { name: "", type: "http", config: { method: "GET", url: "", headers: {}, timeout: 30000 }, continueOnFailure: false, retryCount: 0 };
}

export const STEP_TYPES = ["http", "assertion", "extract", "call", "load-dataset", "browser"] as const;

export const ASSERTION_SOURCES = ["status", "header", "body", "jsonpath", "variable"] as const;
export const ASSERTION_OPERATORS = [
  "equals", "not_equals", "contains", "not_contains",
  "gt", "gte", "lt", "lte", "matches", "exists", "not_exists", "type_is",
] as const;
export const EXTRACT_SOURCES = ["body", "jsonpath", "header", "status", "regex"] as const;

/* ── StepEditor Component ── */

export interface StepEditorProps {
  index: number;
  step: StepForm;
  total: number;
  projectId: string;
  compact?: boolean;
  onChange: (patch: Partial<StepForm>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function StepEditor({ index, step, total, projectId, compact, onChange, onRemove, onMove }: StepEditorProps) {
  const { t } = useTranslation();
  const updateConfig = (patch: Record<string, any>) =>
    onChange({ config: { ...step.config, ...patch } });

  // Lazy-load test cases for "call" step
  const [availableCases, setAvailableCases] = useState<TestCase[]>([]);
  useEffect(() => {
    if (step.type === "call" && projectId) {
      testCases.list(projectId, { pageSize: "200" }).then((r) => setAvailableCases(r.data));
    }
  }, [step.type, projectId]);

  // Lazy-load datasets for "load-dataset" step
  const [availableDatasets, setAvailableDatasets] = useState<TestDataSet[]>([]);
  useEffect(() => {
    if (step.type === "load-dataset" && projectId) {
      datasetsApi.list(projectId).then((d) => setAvailableDatasets(d));
    }
  }, [step.type, projectId]);

  // Helper: get expression hint for assertion source
  const getAssertionExpressionHint = (source: string) => {
    if (source === "jsonpath") return t("testCases.assertionConfig.hintJsonpath");
    if (source === "header") return t("testCases.assertionConfig.hintHeader");
    if (source === "variable") return t("testCases.assertionConfig.hintVariable");
    return "";
  };

  // Helper: get expression placeholder/hint for extract source
  const getExtractExpressionPlaceholder = (source: string) => {
    if (source === "jsonpath") return t("testCases.extractConfig.expressionPlaceholder");
    if (source === "header") return "Content-Type";
    if (source === "regex") return t("testCases.extractConfig.placeholderRegex");
    return "";
  };
  const getExtractExpressionHint = (source: string) => {
    if (source === "jsonpath") return t("testCases.extractConfig.hintJsonpath");
    if (source === "header") return t("testCases.extractConfig.hintHeader");
    if (source === "regex") return t("testCases.extractConfig.hintRegex");
    return "";
  };

  const needsExpression = (source: string) => !["body", "status"].includes(source);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={compact ? "space-y-3" : "rounded-md border p-3 space-y-3"}>
        {/* Header row — hidden in compact mode */}
        {!compact && (
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground w-6">#{index + 1}</span>
            <Input
              className="flex-1 h-8"
              value={step.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={t("testCases.steps.namePlaceholder")}
            />
            <Select value={step.type} onValueChange={(v: any) => {
              const configs: Record<string, any> = {
                http: { method: "GET", url: "", headers: {}, timeout: 30000 },
                assertion: { source: "status", operator: "equals", expected: 200 },
                extract: { source: "jsonpath", expression: "", variableName: "" },
                call: { testCaseId: "" },
                "load-dataset": { datasetId: "", variableName: "" },
                browser: { action: "navigate", url: "" },
              };
              onChange({ type: v, config: configs[v] || {} });
            }}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STEP_TYPES.map((k) => (
                  <SelectItem key={k} value={k}>{t(`testCases.stepType.${k}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(-1)} disabled={index === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("testCases.steps.moveUp")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(1)} disabled={index === total - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("testCases.steps.moveDown")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("testCases.steps.remove")}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Common options row */}
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-muted-foreground">{t("testCases.steps.continueOnFailure")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={step.continueOnFailure}
              onClick={() => onChange({ continueOnFailure: !step.continueOnFailure })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${step.continueOnFailure ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${step.continueOnFailure ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("testCases.steps.retryCount")}</span>
            <Select value={String(step.retryCount)} onValueChange={(v) => onChange({ retryCount: Number(v) })}>
              <SelectTrigger className="h-6 w-14 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── HTTP step config ── */}
        {step.type === "http" && (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Method</Label>
                <Select value={step.config.method || "GET"} onValueChange={(v) => updateConfig({ method: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-5 space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.httpConfig.urlLabel")}</Label>
                <Input
                  className="h-8"
                  value={step.config.url || ""}
                  onChange={(e) => updateConfig({ url: e.target.value })}
                  placeholder={t("testCases.httpConfig.urlPlaceholder")}
                />
                <p className="text-[11px] text-muted-foreground/70">{t("testCases.httpConfig.urlHint")}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.httpConfig.bodyLabel")}</Label>
              <Textarea
                className="font-mono text-xs min-h-[60px]"
                value={typeof step.config.body === "string" ? step.config.body : JSON.stringify(step.config.body ?? "", null, 2)}
                onChange={(e) => {
                  try { updateConfig({ body: JSON.parse(e.target.value) }); }
                  catch { updateConfig({ body: e.target.value }); }
                }}
                placeholder={t("testCases.httpConfig.bodyPlaceholder")}
              />
              <p className="text-[11px] text-muted-foreground/70">{t("testCases.httpConfig.bodyHint")}</p>
            </div>
          </div>
        )}

        {/* ── Assertion step config ── */}
        {step.type === "assertion" && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.assertionConfig.sourceLabel")}</Label>
                <Select value={step.config.source || "status"} onValueChange={(v) => updateConfig({ source: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSERTION_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`testCases.assertionConfig.source.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.assertionConfig.operatorLabel")}</Label>
                <Select value={step.config.operator || "equals"} onValueChange={(v) => updateConfig({ operator: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSERTION_OPERATORS.map((o) => (
                      <SelectItem key={o} value={o}>{t(`testCases.assertionConfig.operator.${o}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.assertionConfig.expectedLabel")}</Label>
                <Input
                  className="h-8"
                  value={step.config.expected ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const num = Number(v);
                    updateConfig({ expected: v === "" ? "" : isNaN(num) ? v : num });
                  }}
                  placeholder={t("testCases.assertionConfig.expectedPlaceholder")}
                />
              </div>
            </div>
            {(step.config.source === "jsonpath" || step.config.source === "header" || step.config.source === "variable") && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.assertionConfig.expressionLabel")}</Label>
                <Input
                  className="h-8"
                  value={step.config.expression || ""}
                  onChange={(e) => updateConfig({ expression: e.target.value })}
                  placeholder={step.config.source === "jsonpath" ? t("testCases.assertionConfig.expressionJsonpath") : step.config.source === "header" ? t("testCases.assertionConfig.expressionHeader") : "variableName"}
                />
                <p className="text-[11px] text-muted-foreground/70">{getAssertionExpressionHint(step.config.source)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Extract step config ── */}
        {step.type === "extract" && (
          <div className="space-y-2">
            <div className={`grid gap-2 ${needsExpression(step.config.source) ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.extractConfig.sourceLabel")}</Label>
                <Select value={step.config.source || "jsonpath"} onValueChange={(v) => updateConfig({ source: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXTRACT_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`testCases.extractConfig.source.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsExpression(step.config.source) && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.extractConfig.expressionLabel")}</Label>
                  <Input
                    className="h-8"
                    value={step.config.expression || ""}
                    onChange={(e) => updateConfig({ expression: e.target.value })}
                    placeholder={getExtractExpressionPlaceholder(step.config.source)}
                  />
                  {getExtractExpressionHint(step.config.source) && (
                    <p className="text-[11px] text-muted-foreground/70">{getExtractExpressionHint(step.config.source)}</p>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.extractConfig.variableLabel")}</Label>
                <Input
                  className="h-8"
                  value={step.config.variableName || ""}
                  onChange={(e) => updateConfig({ variableName: e.target.value })}
                  placeholder={t("testCases.extractConfig.variablePlaceholder")}
                />
                <p className="text-[11px] text-muted-foreground/70">{t("testCases.extractConfig.variableHint")}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Call step config ── */}
        {step.type === "call" && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.callConfig.label")}</Label>
            <SearchableSelect
              value={step.config.testCaseId || ""}
              onValueChange={(v) => updateConfig({ testCaseId: v })}
              options={availableCases.map((tc) => ({
                value: tc.id,
                label: tc.name,
                description: tc.module || undefined,
              }))}
              placeholder={t("testCases.callConfig.placeholder")}
              searchPlaceholder={t("testCases.callConfig.searchPlaceholder")}
              emptyText={t("testCases.callConfig.empty")}
            />
            <p className="text-[11px] text-muted-foreground/70">{t("testCases.callConfig.hint")}</p>
          </div>
        )}

        {/* ── Load-dataset step config ── */}
        {step.type === "load-dataset" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.datasetConfig.datasetLabel")}</Label>
              <SearchableSelect
                value={step.config.datasetId || ""}
                onValueChange={(v) => updateConfig({ datasetId: v })}
                options={availableDatasets.map((ds) => ({
                  value: ds.id,
                  label: ds.name,
                  description: ds.description || undefined,
                }))}
                placeholder={t("testCases.datasetConfig.datasetPlaceholder")}
                searchPlaceholder={t("testCases.datasetConfig.datasetSearchPlaceholder")}
                emptyText={t("testCases.datasetConfig.datasetEmpty")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.datasetConfig.variableLabel")}</Label>
              <Input
                className="h-8"
                value={step.config.variableName || ""}
                onChange={(e) => updateConfig({ variableName: e.target.value })}
                placeholder={t("testCases.datasetConfig.variablePlaceholder")}
              />
              <p className="text-[11px] text-muted-foreground/70">{t("testCases.datasetConfig.variableHint")}</p>
            </div>
          </div>
        )}

        {/* ── Browser step config ── */}
        {step.type === "browser" && (
          <BrowserStepEditor
            config={step.config}
            onChange={(patch) => updateConfig(patch)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
