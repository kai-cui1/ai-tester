import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ProjectProvider } from "@/lib/project-context";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { ProjectsPage } from "@/pages/projects";
import { TestCasesPage } from "@/pages/test-cases";
import { SuitesPage } from "@/pages/suites";
import { RunsPage } from "@/pages/runs";
import { RunDetailPage } from "@/pages/run-detail";
import { DatasetsPage } from "@/pages/datasets";
import { BaselinesPage } from "@/pages/baselines";
import { AiSettingsPage } from "@/pages/ai-settings";
import { AiProvidersPage } from "@/pages/ai-providers";
import { KnowledgePage } from "@/pages/knowledge";
import { AiGeneratePage } from "@/pages/ai-generate";

export function App() {
  return (
    <BrowserRouter>
      <ProjectProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/test-cases" element={<TestCasesPage />} />
            <Route path="/suites" element={<SuitesPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/runs/:id" element={<RunDetailPage />} />
            <Route path="/datasets" element={<DatasetsPage />} />
            <Route path="/baselines" element={<BaselinesPage />} />
            <Route path="/ai/settings" element={<AiSettingsPage />} />
            <Route path="/ai/providers" element={<AiProvidersPage />} />
            <Route path="/ai/knowledge" element={<KnowledgePage />} />
            <Route path="/ai/generate" element={<AiGeneratePage />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </ProjectProvider>
    </BrowserRouter>
  );
}
