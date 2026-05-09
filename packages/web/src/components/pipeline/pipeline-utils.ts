import type { StepForm } from "@/components/step-editor";
import {
  Globe, ShieldCheck, Download, GitBranch, Database,
  type LucideIcon,
} from "lucide-react";

export interface StepTypeStyle {
  icon: LucideIcon;
  color: string;       // Tailwind bg class for the icon badge
  border: string;      // Tailwind border-l class for the card
  label: string;       // i18n key suffix
}

export const STEP_TYPE_STYLES: Record<StepForm["type"], StepTypeStyle> = {
  http:           { icon: Globe,       color: "bg-blue-500",    border: "border-l-blue-500",    label: "http" },
  assertion:      { icon: ShieldCheck, color: "bg-emerald-500", border: "border-l-emerald-500", label: "assertion" },
  extract:        { icon: Download,    color: "bg-violet-500",  border: "border-l-violet-500",  label: "extract" },
  call:           { icon: GitBranch,   color: "bg-amber-500",   border: "border-l-amber-500",   label: "call" },
  "load-dataset": { icon: Database,    color: "bg-cyan-500",    border: "border-l-cyan-500",    label: "load-dataset" },
};

/**
 * Generate a short summary for a step's config, shown on the pipeline node.
 */
export function getStepSummary(step: StepForm): string {
  const c = step.config;
  switch (step.type) {
    case "http":
      return c.method && c.url
        ? `${c.method} ${c.url.length > 40 ? c.url.slice(0, 40) + "..." : c.url}`
        : "";
    case "assertion":
      return c.source && c.operator
        ? `${c.source} ${c.operator} ${c.expected ?? ""}`
        : "";
    case "extract":
      return c.variableName
        ? `${c.source ?? "jsonpath"} -> ${c.variableName}`
        : "";
    case "call":
      return c.testCaseId ? `ID: ${c.testCaseId.slice(0, 8)}...` : "";
    case "load-dataset":
      return c.datasetId ? `ID: ${c.datasetId.slice(0, 8)}...` : "";
    default:
      return "";
  }
}
