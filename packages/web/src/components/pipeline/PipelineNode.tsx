import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StepEditor, type StepForm } from "@/components/step-editor";
import { STEP_TYPE_STYLES, getStepSummary } from "./pipeline-utils";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface PipelineNodeProps {
  index: number;
  step: StepForm;
  total: number;
  projectId: string;
  onChange: (patch: Partial<StepForm>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function PipelineNode({ index, step, total, projectId, onChange, onRemove, onMove }: PipelineNodeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const style = STEP_TYPE_STYLES[step.type];
  const Icon = style.icon;
  const summary = getStepSummary(step);
  const displayName = step.name || t("testCases.pipeline.noName");

  return (
    <div className={`rounded-lg border-l-4 ${style.border} border border-border bg-card shadow-sm transition-shadow hover:shadow-md w-full max-w-lg`}>
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Type icon */}
        <div className={`flex items-center justify-center w-8 h-8 rounded-md ${style.color} text-white shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Name + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
            <span className="font-medium text-sm truncate">{displayName}</span>
          </div>
          {summary && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{summary}</p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {t(`testCases.stepType.${step.type}`)}
          </Badge>
          {step.continueOnFailure && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {t("testCases.steps.continueOnFailure")}
            </Badge>
          )}
          {step.retryCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {t("testCases.steps.retryCount")}: {step.retryCount}
            </Badge>
          )}
        </div>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded: inline StepEditor in compact mode */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {/* Step name + type row for pipeline (compact header replacement) */}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 h-7 px-2 text-sm rounded-md border bg-background"
              value={step.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={t("testCases.steps.namePlaceholder")}
            />
            <select
              className="h-7 px-2 text-sm rounded-md border bg-background"
              value={step.type}
              onChange={(e) => {
                const v = e.target.value as StepForm["type"];
                const configs: Record<string, any> = {
                  http: { method: "GET", url: "", headers: {}, timeout: 30000 },
                  assertion: { source: "status", operator: "equals", expected: 200 },
                  extract: { source: "jsonpath", expression: "", variableName: "" },
                  call: { testCaseId: "" },
                  "load-dataset": { datasetId: "", variableName: "" },
                  browser: { action: "navigate", url: "", timeout: 30000 },
                };
                onChange({ type: v, config: configs[v] || {} });
              }}
            >
              {(["http", "assertion", "extract", "call", "load-dataset", "browser"] as const).map((k) => (
                <option key={k} value={k}>{t(`testCases.stepType.${k}`)}</option>
              ))}
            </select>
          </div>

          <StepEditor
            index={index}
            step={step}
            total={total}
            projectId={projectId}
            compact
            onChange={onChange}
            onRemove={onRemove}
            onMove={onMove}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1 border-t">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onMove(-1)} disabled={index === 0}>
                {t("testCases.steps.moveUp")}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onMove(1)} disabled={index === total - 1}>
                {t("testCases.steps.moveDown")}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={onRemove}>
              <Trash2 className="h-3 w-3 mr-1" />
              {t("testCases.steps.remove")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
