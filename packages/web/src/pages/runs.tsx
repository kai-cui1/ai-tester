import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { runs, type TestRun } from "@/lib/api";
import { CheckCircle, XCircle, Clock, Play, AlertCircle } from "lucide-react";

const statusIcons: Record<string, any> = {
  passed: CheckCircle,
  failed: XCircle,
  error: AlertCircle,
  running: Play,
  pending: Clock,
  cancelled: Clock,
};

const statusVariants: Record<string, string> = {
  passed: "success",
  failed: "destructive",
  error: "destructive",
  running: "default",
  pending: "secondary",
  cancelled: "secondary",
};

export function RunsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [list, setList] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runs.list({ pageSize: "100" }).then((r) => setList(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("runs.title")}</h1>
        <p className="text-muted-foreground">{t("runs.subtitle")}</p>
      </div>

      {list.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {t("runs.empty")}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("runs.table.runId")}</TableHead>
                <TableHead>{t("runs.table.status")}</TableHead>
                <TableHead>{t("runs.table.environment")}</TableHead>
                <TableHead>{t("runs.table.cases")}</TableHead>
                <TableHead>{t("runs.table.passRate")}</TableHead>
                <TableHead>{t("runs.table.duration")}</TableHead>
                <TableHead>{t("runs.table.triggeredBy")}</TableHead>
                <TableHead>{t("runs.table.time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((run) => {
                const Icon = statusIcons[run.status] || Clock;
                const variant = statusVariants[run.status] || "secondary";
                const passRate = run.totalCases > 0 ? Math.round((run.passedCases / run.totalCases) * 100) : 0;
                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{run.id.slice(0, 12)}...</TableCell>
                    <TableCell>
                      <Badge variant={variant as any} className="gap-1">
                        <Icon className="h-3 w-3" /> {t(`status.${run.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.environment}</TableCell>
                    <TableCell>
                      <span className="text-success">{run.passedCases}</span>
                      {" / "}
                      <span>{run.totalCases}</span>
                      {run.failedCases > 0 && (
                        <span className="text-destructive ml-1">{t("runs.failedCount", { count: run.failedCases })}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={passRate >= 80 ? "text-success" : passRate >= 50 ? "text-warning" : "text-destructive"}>
                        {passRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{run.triggeredBy}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString(i18n.language)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
