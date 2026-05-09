import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projects, runs, type Project, type TestRun } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import { FolderOpen, Play, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { current } = useProject();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projects.list().catch(() => []),
      runs.list({ pageSize: "10" }).catch(() => ({ data: [], meta: { total: 0, page: 1, pageSize: 10 } })),
    ]).then(([p, r]) => {
      setProjectList(p);
      setRecentRuns(r.data);
      setLoading(false);
    });
  }, []);

  const stats = {
    projects: projectList.length,
    totalRuns: recentRuns.length,
    passed: recentRuns.filter((r) => r.status === "passed").length,
    failed: recentRuns.filter((r) => r.status === "failed" || r.status === "error").length,
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.stats.projects")}</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.stats.recentRuns")}</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.stats.passed")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.stats.failed")}</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      {!current && projectList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.selectProject")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/projects")}>
              {t("dashboard.goToProjects")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent runs */}
      {recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentTestRuns")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/runs/${run.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <RunStatusIcon status={run.status} />
                    <div>
                      <p className="text-sm font-medium">{t("dashboard.runId", { id: run.id.slice(0, 8) })}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.environment} &middot; {t("dashboard.caseCount", { count: run.totalCases })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RunStatusBadge status={run.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString(i18n.language)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "passed":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "failed":
    case "error":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "running":
      return <Play className="h-5 w-5 text-primary animate-pulse-soft" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function RunStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant =
    status === "passed"
      ? "success"
      : status === "failed" || status === "error"
        ? "destructive"
        : status === "running"
          ? "default"
          : "secondary";
  const key = `status.${status}` as const;
  return <Badge variant={variant as any}>{t(key)}</Badge>;
}
