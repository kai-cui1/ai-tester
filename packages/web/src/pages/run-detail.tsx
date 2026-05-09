import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runs, type TestRun, type TestCaseResult, type TestStepResult } from "@/lib/api";
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

export function RunDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    runs.get(id).then(setRun).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  if (!run) return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("runDetail.notFound")}</div>;

  const passRate = run.totalCases > 0 ? Math.round((run.passedCases / run.totalCases) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/runs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {t("runDetail.title")}
            <StatusBadge status={run.status} />
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{run.id}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("runDetail.summary.totalCases")}</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">{run.totalCases}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("runDetail.summary.passed")}</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-success">{run.passedCases}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("runDetail.summary.failed")}</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-destructive">{run.failedCases}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("runDetail.summary.passRate")}</CardTitle></CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${passRate >= 80 ? "text-success" : passRate >= 50 ? "text-warning" : "text-destructive"}`}>
              {passRate}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Meta info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">{t("runDetail.meta.environment")}</span> <span className="font-medium">{run.environment}</span></div>
            <div><span className="text-muted-foreground">{t("runDetail.meta.triggeredBy")}</span> <Badge variant="outline">{run.triggeredBy}</Badge></div>
            <div><span className="text-muted-foreground">{t("runDetail.meta.duration")}</span> <span className="font-medium">{run.durationMs != null ? `${(run.durationMs / 1000).toFixed(2)}s` : "-"}</span></div>
            <div><span className="text-muted-foreground">{t("runDetail.meta.started")}</span> <span className="font-medium">{new Date(run.startedAt).toLocaleString(i18n.language)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Case results */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("runDetail.caseResults")}</h2>
        {run.caseResults.length === 0 ? (
          <p className="text-muted-foreground">{t("runDetail.noCaseResults")}</p>
        ) : (
          run.caseResults.map((cr) => <CaseResultCard key={cr.id} result={cr} />)
        )}
      </div>
    </div>
  );
}

function CaseResultCard({ result }: { result: TestCaseResult }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(result.status !== "passed");

  return (
    <Card>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <StatusIcon status={result.status} />
        <span className="font-medium flex-1">{result.testCaseName}</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{t("runDetail.steps", { passed: result.passedSteps, total: result.totalSteps })}</span>
          {result.durationMs != null && <span>{result.durationMs}ms</span>}
        </div>
        <StatusBadge status={result.status} />
      </div>

      {expanded && result.stepResults.length > 0 && (
        <>
          <Separator />
          <div className="p-4 space-y-2">
            {result.stepResults.map((sr) => (
              <StepResultRow key={sr.id} step={sr} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function StepResultRow({ step }: { step: TestStepResult }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(step.status !== "passed");

  return (
    <div className="rounded border">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/20 transition-colors text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        <StatusIcon status={step.status} size="sm" />
        <Badge variant="outline" className="text-xs font-mono">{step.stepType}</Badge>
        <span className="flex-1">{step.stepName}</span>
        <span className="text-xs text-muted-foreground">{step.durationMs}ms</span>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="h-8">
              <TabsTrigger value="overview" className="text-xs h-7">{t("runDetail.tabs.overview")}</TabsTrigger>
              {step.request && <TabsTrigger value="request" className="text-xs h-7">{t("runDetail.tabs.request")}</TabsTrigger>}
              {step.response && <TabsTrigger value="response" className="text-xs h-7">{t("runDetail.tabs.response")}</TabsTrigger>}
              {step.assertion && <TabsTrigger value="assertion" className="text-xs h-7">{t("runDetail.tabs.assertion")}</TabsTrigger>}
              {step.error && <TabsTrigger value="error" className="text-xs h-7">{t("runDetail.tabs.error")}</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview">
              <div className="text-xs space-y-1">
                <p>{t("runDetail.overview.type")}<span className="font-mono">{step.stepType}</span></p>
                <p>{t("runDetail.overview.status")}<StatusBadge status={step.status} /></p>
                <p>{t("runDetail.overview.duration")}{step.durationMs}ms</p>
                {step.extractedVar && (
                  <p>{t("runDetail.overview.extracted")}<span className="font-mono">{step.extractedVar.variableName}</span> = <span className="font-mono text-primary">{JSON.stringify(step.extractedVar.value)}</span></p>
                )}
              </div>
            </TabsContent>

            {step.request && (
              <TabsContent value="request">
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
                  {JSON.stringify(step.request, null, 2)}
                </pre>
              </TabsContent>
            )}

            {step.response && (
              <TabsContent value="response">
                <div className="text-xs space-y-1">
                  <p>{t("runDetail.response.status")}<Badge variant={step.response.status < 400 ? "success" : "destructive"}>{step.response.status}</Badge></p>
                  <p>{t("runDetail.response.responseTime")}{step.response.responseTimeMs}ms</p>
                </div>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48 mt-2">
                  {JSON.stringify(step.response.body, null, 2)}
                </pre>
              </TabsContent>
            )}

            {step.assertion && (
              <TabsContent value="assertion">
                <div className="text-xs space-y-1">
                  <p>{t("runDetail.assertionDetail.operator")}<span className="font-mono">{step.assertion.operator}</span></p>
                  <p>{t("runDetail.assertionDetail.expected")}<span className="font-mono text-primary">{JSON.stringify(step.assertion.expected)}</span></p>
                  <p>{t("runDetail.assertionDetail.actual")}<span className="font-mono">{JSON.stringify(step.assertion.actual)}</span></p>
                  <p>{t("runDetail.assertionDetail.result")}{step.assertion.passed ? <Badge variant="success">{t("status.passed")}</Badge> : <Badge variant="destructive">{t("status.failed")}</Badge>}</p>
                </div>
              </TabsContent>
            )}

            {step.error && (
              <TabsContent value="error">
                <div className="text-xs text-destructive">
                  <p className="font-medium">{step.error.message}</p>
                  {step.error.stack && <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto max-h-32">{step.error.stack}</pre>}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  switch (status) {
    case "passed": return <CheckCircle className={`${cls} text-success`} />;
    case "failed": return <XCircle className={`${cls} text-destructive`} />;
    case "error": return <AlertCircle className={`${cls} text-destructive`} />;
    case "skipped": return <Clock className={`${cls} text-muted-foreground`} />;
    default: return <Clock className={`${cls} text-muted-foreground`} />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant = status === "passed" ? "success" : status === "failed" || status === "error" ? "destructive" : "secondary";
  return <Badge variant={variant as any}>{t(`status.${status}`)}</Badge>;
}
