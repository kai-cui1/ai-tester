import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { emptyStep, type StepForm } from "@/components/step-editor";
import { PipelineNode } from "./PipelineNode";
import { PipelineConnector } from "./PipelineConnector";
import { Plus, Play, Flag } from "lucide-react";

interface PipelineViewProps {
  steps: StepForm[];
  projectId: string;
  onStepsChange: (steps: StepForm[]) => void;
}

export function PipelineView({ steps, projectId, onStepsChange }: PipelineViewProps) {
  const { t } = useTranslation();

  const updateStep = (i: number, patch: Partial<StepForm>) =>
    onStepsChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const removeStep = (i: number) =>
    onStepsChange(steps.filter((_, idx) => idx !== i));

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onStepsChange(next);
  };

  const insertStep = (atIndex: number, type: StepForm["type"]) => {
    const configs: Record<string, any> = {
      http: { method: "GET", url: "", headers: {}, timeout: 30000 },
      assertion: { source: "status", operator: "equals", expected: 200 },
      extract: { source: "jsonpath", expression: "", variableName: "" },
      call: { testCaseId: "" },
      "load-dataset": { datasetId: "", variableName: "" },
    };
    const step: StepForm = { name: "", type, config: configs[type] || {}, continueOnFailure: false, retryCount: 0 };
    const next = [...steps];
    next.splice(atIndex, 0, step);
    onStepsChange(next);
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <p className="text-sm text-muted-foreground">{t("testCases.pipeline.emptyPipeline")}</p>
        <Button variant="outline" onClick={() => onStepsChange([emptyStep()])}>
          <Plus className="mr-1 h-4 w-4" />
          {t("testCases.pipeline.addFirstStep")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 space-y-0">
      {/* Start node */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground">
        <Play className="h-3 w-3" />
        {t("testCases.pipeline.startNode")}
      </div>

      {/* Steps with connectors */}
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col items-center w-full">
          <PipelineConnector onInsert={(type) => insertStep(i, type)} />
          <PipelineNode
            index={i}
            step={step}
            total={steps.length}
            projectId={projectId}
            onChange={(patch) => updateStep(i, patch)}
            onRemove={() => removeStep(i)}
            onMove={(dir) => moveStep(i, dir)}
          />
        </div>
      ))}

      {/* Final connector + add */}
      <PipelineConnector onInsert={(type) => insertStep(steps.length, type)} />

      {/* End node */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground">
        <Flag className="h-3 w-3" />
        {t("testCases.pipeline.endNode")}
      </div>
    </div>
  );
}
