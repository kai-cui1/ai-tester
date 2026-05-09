import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STEP_TYPES } from "@/components/step-editor";
import { STEP_TYPE_STYLES } from "./pipeline-utils";
import { Plus } from "lucide-react";

interface PipelineConnectorProps {
  onInsert: (type: (typeof STEP_TYPES)[number]) => void;
}

export function PipelineConnector({ onInsert }: PipelineConnectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center">
      {/* Top line */}
      <div className="w-px h-4 bg-border" />
      {/* Insert button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground/60 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
            title={t("testCases.pipeline.insertStep")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {STEP_TYPES.map((type) => {
            const style = STEP_TYPE_STYLES[type];
            const Icon = style.icon;
            return (
              <DropdownMenuItem key={type} onClick={() => onInsert(type)}>
                <Icon className="mr-2 h-4 w-4" />
                {t(`testCases.stepType.${type}`)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Bottom line */}
      <div className="w-px h-4 bg-border" />
    </div>
  );
}
