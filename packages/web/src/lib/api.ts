const BASE = "/api/v1";
const API_KEY = import.meta.env.VITE_API_KEY || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }
  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...init?.headers },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? res.statusText);
  return json.data as T;
}

/* ── types ── */
export interface Environment {
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  environments: Environment[];
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  id: string;
  name: string;
  type: "http" | "assertion" | "extract" | "call" | "load-dataset" | "browser";
  config: Record<string, any>;
  order: number;
  continueOnFailure: boolean;
  retryCount: number;
}

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  module: string;
  tags: string[];
  priority: "critical" | "high" | "medium" | "low";
  steps: TestStep[];
  variables: Record<string, string>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuite {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  testCaseIds: string[];
  parallelism: number;
  environment?: string;
  variables: Record<string, string>;
  setupCaseId?: string;
  teardownCaseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestStepResult {
  id: string;
  caseResultId: string;
  stepId: string;
  stepName: string;
  stepType: string;
  status: "passed" | "failed" | "error" | "skipped";
  request?: { method: string; url: string; headers?: Record<string, string>; body?: any };
  response?: { status: number; headers?: Record<string, string>; body?: any; responseTimeMs: number };
  assertion?: { expression?: string; operator: string; expected?: any; actual?: any; passed: boolean };
  extractedVar?: { variableName: string; value: any };
  error?: { message: string; stack?: string };
  browser?: {
    action: string;
    url?: string;
    title?: string;
    screenshot?: string;
    assertion?: {
      type: string;
      selector?: string;
      operator: string;
      expected?: any;
      actual?: any;
      passed: boolean;
    };
  };
  durationMs: number;
}

export interface TestCaseResult {
  id: string;
  runId: string;
  testCaseId: string;
  testCaseName: string;
  status: "passed" | "failed" | "error" | "skipped";
  stepResults: TestStepResult[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
}

export interface TestRun {
  id: string;
  suiteId: string;
  status: "pending" | "running" | "passed" | "failed" | "error" | "cancelled";
  environment: string;
  variables: Record<string, string>;
  caseResults: TestCaseResult[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  triggeredBy: "manual" | "api" | "mcp";
  createdAt: string;
}

export interface DataField {
  name: string;
  type: "string" | "number" | "boolean" | "email" | "uuid" | "date" | "custom";
}

export interface TestDataSet {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  fields: DataField[];
  rows: Record<string, any>[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

/* ── Projects ── */
export const projects = {
  list: () => request<Project[]>("/projects"),
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (body: { name: string; description?: string; environments?: Environment[] }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Pick<Project, "name" | "description" | "environments">>) =>
    request<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
};

/* ── Test Cases ── */
export const testCases = {
  list: (projectId: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const headers: Record<string, string> = {};
    if (API_KEY) headers["X-API-Key"] = API_KEY;
    return fetch(`${BASE}/projects/${projectId}/test-cases${qs}`, { headers })
      .then((r) => r.json())
      .then((j) => ({ data: j.data, meta: j.meta }) as Paginated<TestCase>);
  },
  get: (id: string) => request<TestCase>(`/test-cases/${id}`),
  create: (projectId: string, body: Partial<TestCase>) =>
    request<TestCase>(`/projects/${projectId}/test-cases`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<TestCase>) =>
    request<TestCase>(`/test-cases/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/test-cases/${id}`, { method: "DELETE" }),
  duplicate: (id: string) =>
    request<TestCase>(`/test-cases/${id}/duplicate`, { method: "POST" }),
};

/* ── Suites ── */
export const suites = {
  list: (projectId: string) => request<TestSuite[]>(`/projects/${projectId}/suites`),
  get: (id: string) => request<TestSuite>(`/suites/${id}`),
  create: (projectId: string, body: Partial<TestSuite>) =>
    request<TestSuite>(`/projects/${projectId}/suites`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<TestSuite>) =>
    request<TestSuite>(`/suites/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/suites/${id}`, { method: "DELETE" }),
};

/* ── Runs ── */
export const runs = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const headers: Record<string, string> = {};
    if (API_KEY) headers["X-API-Key"] = API_KEY;
    return fetch(`${BASE}/runs${qs}`, { headers })
      .then((r) => r.json())
      .then((j) => ({ data: j.data, meta: j.meta }) as Paginated<TestRun>);
  },
  get: (id: string) => request<TestRun>(`/runs/${id}`),
  trigger: (body: { suiteId: string; environment: string; variables?: Record<string, string>; triggeredBy?: string }) =>
    request<TestRun>("/runs", { method: "POST", body: JSON.stringify(body) }),
};

/* ── Datasets ── */
export const datasets = {
  list: (projectId: string) => request<TestDataSet[]>(`/projects/${projectId}/datasets`),
  get: (id: string) => request<TestDataSet>(`/datasets/${id}`),
  create: (projectId: string, body: Partial<TestDataSet>) =>
    request<TestDataSet>(`/projects/${projectId}/datasets`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<TestDataSet>) =>
    request<TestDataSet>(`/datasets/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/datasets/${id}`, { method: "DELETE" }),
};

export interface AiModel {
  id: string;
  projectId: string;
  name: string;
  provider: "openai" | "anthropic" | "custom";
  apiFormat: "openai" | "anthropic";
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt: string;
  maskedApiKey?: string;
}

export const aiModel = {
  list: (projectId: string) => request<AiModel[]>(`/projects/${projectId}/ai-models`),
  active: (projectId: string) => request<AiModel | null>(`/projects/${projectId}/ai-models/active`),
  setActive: (projectId: string, modelId: string | null) =>
    request<void>(`/projects/${projectId}/ai-models/active`, { method: "PUT", body: JSON.stringify({ modelId }) }),
  create: (projectId: string, body: Omit<AiModel, "id" | "projectId" | "createdAt" | "updatedAt" | "maskedApiKey">) =>
    request<AiModel>(`/projects/${projectId}/ai-models`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Omit<AiModel, "id" | "projectId" | "createdAt" | "updatedAt" | "maskedApiKey">>) =>
    request<AiModel>(`/ai-models/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/ai-models/${id}`, { method: "DELETE" }),
  test: (id: string) =>
    request<{ success: boolean; message: string; durationMs: number; logs: string[] }>(`/ai-models/${id}/test`, { method: "POST" }),
};

/* ── AI Provider Configs ── */
export interface AiProviderConfig {
  id: string;
  name: string;
  key: string;
  baseUrl?: string | null;
  apiFormat: "openai" | "anthropic";
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const aiProvider = {
  list: () => request<AiProviderConfig[]>("/ai-provider-configs"),
  create: (body: Omit<AiProviderConfig, "id" | "createdAt" | "updatedAt">) =>
    request<AiProviderConfig>("/ai-provider-configs", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Omit<AiProviderConfig, "id" | "createdAt" | "updatedAt">>) =>
    request<AiProviderConfig>(`/ai-provider-configs/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/ai-provider-configs/${id}`, { method: "DELETE" }),
};

/* ── API Endpoints (Knowledge) ── */
export interface EndpointParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  type: string;
  required: boolean;
  description?: string;
}

export interface ApiEndpoint {
  id: string;
  projectId: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters: EndpointParameter[];
  requestBody?: string;
  responseBody?: string;
  authentication?: "bearer" | "api-key" | "basic" | "none";
  source: "manual" | "openapi" | "curl" | "text";
  createdAt: string;
  updatedAt: string;
}

export const endpoints = {
  list: (projectId: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ApiEndpoint[]>(`/projects/${projectId}/endpoints${qs}`);
  },
  get: (id: string) => request<ApiEndpoint>(`/endpoints/${id}`),
  create: (projectId: string, body: Partial<ApiEndpoint>) =>
    request<ApiEndpoint>(`/projects/${projectId}/endpoints`, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ApiEndpoint>) =>
    request<ApiEndpoint>(`/endpoints/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/endpoints/${id}`, { method: "DELETE" }),
  importOpenApi: (projectId: string, content: string) =>
    request<ApiEndpoint[]>(`/projects/${projectId}/endpoints/import/openapi`, {
      method: "POST", body: JSON.stringify({ content }),
    }),
  importCurl: (projectId: string, content: string) =>
    request<ApiEndpoint[]>(`/projects/${projectId}/endpoints/import/curl`, {
      method: "POST", body: JSON.stringify({ content }),
    }),
  parseText: (projectId: string, content: string) =>
    request<Partial<ApiEndpoint>[]>(`/projects/${projectId}/endpoints/parse-text`, {
      method: "POST", body: JSON.stringify({ content }),
    }),
};

/* ── AI Generation ── */
export interface GeneratedStepPreview {
  name: string;
  type: "http" | "assertion" | "extract";
  config: Record<string, any>;
  continueOnFailure: boolean;
  retryCount: number;
}

export interface GeneratedTestCasePreview {
  name: string;
  description?: string;
  module: string;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  steps: GeneratedStepPreview[];
  variables: Record<string, string>;
  endpointId?: string;
  reasoning?: string;
}

export interface GenerationTask {
  id: string;
  projectId: string;
  endpointIds: string[];
  strategy: "happy_path" | "error_cases" | "auth_cases" | "comprehensive";
  status: "pending" | "running" | "completed" | "failed";
  generatedCases: GeneratedTestCasePreview[];
  confirmedCaseIds: string[];
  error?: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export const aiGeneration = {
  generate: (projectId: string, body: { endpointIds: string[]; strategy: string; customPrompt?: string }) =>
    request<GenerationTask>(`/projects/${projectId}/ai/generate`, {
      method: "POST", body: JSON.stringify(body),
    }),
  listTasks: (projectId: string) => request<GenerationTask[]>(`/projects/${projectId}/ai/tasks`),
  getTask: (id: string) => request<GenerationTask>(`/ai/tasks/${id}`),
  confirm: (id: string, selectedIndices: number[]) =>
    request<{ confirmedCount: number; testCaseIds: string[] }>(`/ai/tasks/${id}/confirm`, {
      method: "POST", body: JSON.stringify({ selectedIndices }),
    }),
};
