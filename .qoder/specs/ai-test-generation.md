# AI 自动生成测试用例 — 实施规格

## Context

AI-Tester 已完成 MVP 基础设施（项目/用例/套件/运行 CRUD + HTTP 测试执行引擎 + Web UI 管理后台）。当前所有测试用例需手动编写。本次实施的核心目标是：**让 AI 根据 API 知识自动生成结构化的测试用例**，直接入库并可执行。

关键决策：
- LLM 接入可配置化，支持用户自带 API Key（OpenAI / Anthropic / 自定义端点）
- 知识源第一版从文档输入起步（手动录入 + OpenAPI 导入 + cURL 解析 + 自由文本 LLM 解析），预留代码分析接口
- MCP 对接留到下一阶段

---

## 架构

```
packages/ai/  (新建包)          packages/server/          packages/web/
├── models/                     ├── routes/                ├── pages/
│   ├── ai-config.ts           │   ├── ai-config.ts  (新) │   ├── ai-settings.tsx  (新)
│   ├── api-endpoint.ts        │   ├── ai-endpoints.ts(新)│   ├── knowledge.tsx    (新)
│   └── generation.ts          │   └── ai-generation.ts(新)│   └── ai-generate.tsx  (新)
├── providers/                  ├── services/              ├── lib/api.ts (修改)
│   ├── types.ts               │   └── container.ts (修改) ├── App.tsx (修改)
│   ├── openai-provider.ts     └── app.ts (修改)          └── sidebar.tsx (修改)
│   └── provider-factory.ts
├── parsers/
│   ├── types.ts
│   ├── openapi-parser.ts
│   └── curl-parser.ts
├── generation/
│   ├── generator.ts
│   ├── prompts.ts
│   └── strategies.ts
├── store/
│   ├── repository.ts
│   ├── prisma-ai-config.ts
│   ├── prisma-api-endpoint.ts
│   └── prisma-generation-task.ts
└── crypto.ts
```

依赖方向：`ai → core → shared`，`server → ai`。core 不依赖 ai。

---

## Prisma Schema 新增（`prisma/schema.prisma`）

### AiConfig（1:1 per Project）

```prisma
model AiConfig {
  id          String   @id
  projectId   String   @unique
  provider    String               // "openai" | "anthropic" | "custom"
  model       String               // "gpt-4o", "claude-sonnet-4-20250514" 等
  apiKey      String               // AES-256-GCM 加密存储
  baseUrl     String?              // 自定义 OpenAI-compatible 端点
  temperature Float    @default(0.7)
  maxTokens   Int      @default(4096)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

### ApiEndpoint（知识库端点）

```prisma
model ApiEndpoint {
  id             String   @id
  projectId      String
  method         String               // GET/POST/PUT/PATCH/DELETE
  path           String               // "/api/users/:id"
  summary        String
  description    String?
  tags           String   @default("[]")   // JSON
  parameters     String   @default("[]")   // JSON: [{name, in, type, required, description}]
  requestBody    String?                    // JSON schema 描述
  responseBody   String?                    // JSON schema 描述
  authentication String?                    // "bearer" | "api-key" | "basic" | "none"
  source         String   @default("manual") // "manual" | "openapi" | "curl" | "text"
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}
```

### GenerationTask

```prisma
model GenerationTask {
  id               String    @id
  projectId        String
  endpointIds      String    @default("[]")   // JSON
  strategy         String                      // "happy_path" | "error_cases" | "auth_cases" | "comprehensive"
  status           String    @default("pending") // pending | running | completed | failed
  generatedCases   String    @default("[]")   // JSON: CreateTestCase[] 预览
  confirmedCaseIds String    @default("[]")   // JSON: 确认后创建的 TestCase ID[]
  error            String?
  tokenUsage       String?                    // JSON: {prompt, completion, total}
  durationMs       Int?
  createdAt        DateTime  @default(now())
  completedAt      DateTime?

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([status])
}
```

在 Project 模型追加反向关系：
```prisma
aiConfig        AiConfig?
apiEndpoints    ApiEndpoint[]
generationTasks GenerationTask[]
```

---

## 关键接口定义

### LlmProvider（`packages/ai/src/providers/types.ts`）

```typescript
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

interface LlmProvider {
  chatCompletion(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<string>
  structuredOutput<T>(messages: ChatMessage[], schema: ZodSchema<T>, options?: { temperature?: number; maxTokens?: number }): Promise<T>
}
```

- `chatCompletion`: 自由文本对话，用于自由文本知识解析
- `structuredOutput`: JSON mode 强约束输出，用于测试用例生成

### KnowledgeParser（`packages/ai/src/parsers/types.ts`）

```typescript
interface KnowledgeParser<TInput> {
  parse(input: TInput, projectId: string): Promise<CreateApiEndpoint[]>
}
```

所有解析器统一输出 `CreateApiEndpoint[]`，预留未来代码分析扩展。

### TestCaseGenerator（`packages/ai/src/generation/generator.ts`）

```typescript
class TestCaseGenerator {
  constructor(deps: { provider: LlmProvider })
  generate(endpoints: ApiEndpoint[], strategy: GenerationStrategy, customPrompt?: string): Promise<GeneratedTestCasePreview[]>
}
```

GeneratedTestCasePreview 与 CreateTestCase 结构对齐，额外包含 `endpointId`（来源端点）和 `reasoning`（LLM 推理说明）。

### Repository 接口（`packages/ai/src/store/repository.ts`）

```typescript
interface AiConfigRepository {
  upsert(data: CreateAiConfig): Promise<AiConfig>
  findByProjectId(projectId: string): Promise<AiConfig | null>
  delete(projectId: string): Promise<void>
}

interface ApiEndpointRepository {
  create(data: CreateApiEndpoint): Promise<ApiEndpoint>
  createMany(data: CreateApiEndpoint[]): Promise<ApiEndpoint[]>
  findById(id: string): Promise<ApiEndpoint | null>
  findByProjectId(projectId: string, filters?: { method?: string; search?: string }): Promise<ApiEndpoint[]>
  update(id: string, data: UpdateApiEndpoint): Promise<ApiEndpoint>
  delete(id: string): Promise<void>
}

interface GenerationTaskRepository {
  create(data: CreateGenerationTask): Promise<GenerationTask>
  findById(id: string): Promise<GenerationTask | null>
  findByProjectId(projectId: string): Promise<GenerationTask[]>
  update(id: string, data: Partial<GenerationTask>): Promise<GenerationTask>
}
```

实现模式与现有 `PrismaProjectRepository` 完全一致。

---

## 后端 API 端点

### AI Config

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/:projectId/ai-config` | 获取配置（apiKey 掩码返回） |
| PUT | `/projects/:projectId/ai-config` | 创建/更新配置（upsert） |
| DELETE | `/projects/:projectId/ai-config` | 删除配置 |
| POST | `/projects/:projectId/ai-config/test` | 测试 LLM 连接 |

### Knowledge Endpoints

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/projects/:projectId/endpoints` | 手动创建端点 |
| GET | `/projects/:projectId/endpoints` | 列表（?method=&search=） |
| GET | `/endpoints/:id` | 详情 |
| PUT | `/endpoints/:id` | 更新 |
| DELETE | `/endpoints/:id` | 删除 |
| POST | `/projects/:projectId/endpoints/import/openapi` | OpenAPI 文档导入 |
| POST | `/projects/:projectId/endpoints/import/curl` | cURL 解析导入 |
| POST | `/projects/:projectId/endpoints/parse-text` | 自由文本 LLM 解析（返回预览，不直接入库） |

### Generation

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/projects/:projectId/ai/generate` | 触发生成（同步返回结果） |
| GET | `/projects/:projectId/ai/tasks` | 任务历史 |
| GET | `/ai/tasks/:id` | 任务详情 |
| POST | `/ai/tasks/:id/confirm` | 确认入库 {selectedIndices: number[]} |

---

## 前端页面

### 路由

```
/ai/settings   → AiSettingsPage  (needsProject)
/ai/knowledge  → KnowledgePage   (needsProject)
/ai/generate   → GeneratePage    (needsProject)
```

侧边栏在 Datasets 之后追加 AI 功能区：AI 设置、知识库、用例生成。

### AI Settings 页面

纯表单页（非 Dialog），1:1 配置：
- Provider 下拉（OpenAI / Anthropic / Custom）
- Model 输入（带预设建议：gpt-4o、gpt-4o-mini、claude-sonnet-4-20250514 等）
- API Key 密码输入（加载时显示掩码）
- Base URL（仅 Custom 时显示）
- Temperature 输入（0-2）
- Max Tokens 输入
- "测试连接"按钮 + "保存"按钮

### Knowledge 页面

- 端点表格（Method badge | Path | Summary | Auth | Source | 操作）
- "添加端点"按钮 → EndpointDialog（手动表单录入）
- "导入 OpenAPI"按钮 → ImportOpenApiDialog（粘贴 JSON/YAML → 预览解析结果 → 确认导入）
- "解析 cURL"按钮 → ParseCurlDialog（粘贴 cURL → 预览 → 添加）
- "AI 解析文本"按钮 → ParseTextDialog（输入自由描述 → LLM 解析 → 预览 → 添加）

### Generate 页面（3 步向导）

**Step 1 - 选择端点**：知识库端点 checkbox 多选列表
**Step 2 - 选择策略**：卡片式策略选择（happy_path / error_cases / auth_cases / comprehensive）+ 可选自定义 prompt
**Step 3 - 审核确认**：生成结果预览列表（可展开查看步骤详情），checkbox 批量选择 → "确认入库" → 跳转到 Test Cases 页面

---

## 实施步骤

### Step 1: packages/ai 骨架 + Prisma Schema

- 创建 `packages/ai/` 目录：package.json, tsconfig.json, tsup.config.ts, src/index.ts
- 扩展 `prisma/schema.prisma`：AiConfig + ApiEndpoint + GenerationTask + Project 反向关系
- 运行 `prisma migrate dev`
- 安装依赖：`openai`、`zod`、`@ai-tester/core`、`@ai-tester/shared`

**新建**: `packages/ai/{package.json, tsconfig.json, tsup.config.ts, src/index.ts}`
**修改**: `prisma/schema.prisma`

### Step 2: AI 模型 + 仓储层

- `packages/ai/src/models/` — AiConfig、ApiEndpoint、GenerationTask 的 Zod schemas
- `packages/ai/src/store/` — 三个 Repository 接口 + Prisma 实现
- `packages/ai/src/crypto.ts` — API Key 加密/解密/掩码

**新建**: 10 个文件

### Step 3: LLM Provider 抽象层

- `packages/ai/src/providers/types.ts` — LlmProvider 接口
- `packages/ai/src/providers/openai-provider.ts` — OpenAI SDK 实现（含 structuredOutput）
- `packages/ai/src/providers/provider-factory.ts` — config → provider 实例

P0 只实现 OpenAI provider（覆盖 OpenAI + compatible 端点），Anthropic stub 预留。

**新建**: 5 个文件
**新增依赖**: `openai` SDK

### Step 4: 知识解析器 + 生成引擎

- `packages/ai/src/parsers/` — KnowledgeParser 接口 + OpenAPI 解析器 + cURL 解析器
- `packages/ai/src/generation/` — strategies.ts + prompts.ts + generator.ts

核心：generator 通过 `provider.structuredOutput()` 输出符合 CreateTestCase schema 的结构化用例。

**新建**: 8 个文件

### Step 5: 后端 API 路由

- `packages/server/src/routes/ai-config.ts` — AI 配置 CRUD + 连接测试
- `packages/server/src/routes/ai-endpoints.ts` — 知识端点 CRUD + 3 种导入
- `packages/server/src/routes/ai-generation.ts` — 生成触发 + 确认入库
- 更新 `container.ts` 添加 AI repo 单例
- 更新 `app.ts` 注册新路由
- 更新 `packages/server/package.json` 添加 `@ai-tester/ai` 依赖

**新建**: 3 个路由文件
**修改**: `container.ts`, `app.ts`, `package.json`

### Step 6: 前端基础设施

- `lib/api.ts` — 添加 aiConfig、endpoints、aiGeneration 三个命名空间 + 新 TypeScript interface
- `sidebar.tsx` — navItems 追加 3 个 AI 导航项
- `en.ts` / `zh-CN.ts` — 添加 aiSettings、knowledge、aiGenerate 翻译键

**修改**: 4 个文件

### Step 7: 前端 3 个页面

- `pages/ai-settings.tsx` — AI 配置表单页
- `pages/knowledge.tsx` — 知识库管理（表格 + 4 种导入 Dialog）
- `pages/ai-generate.tsx` — 3 步向导生成页
- `App.tsx` — 注册 3 条新路由

**新建**: 3 个页面文件
**修改**: `App.tsx`

### Step 8: TypeCheck + Build + 端到端验证

- `pnpm --filter @ai-tester/ai typecheck && pnpm --filter @ai-tester/ai build`
- `pnpm --filter @ai-tester/server typecheck && pnpm --filter @ai-tester/server build`
- `pnpm --filter @ai-tester/web typecheck && pnpm --filter @ai-tester/web build`
- 手动 E2E：配置 AI → 录入端点 → 生成用例 → 预览审核 → 确认入库 → 在 Test Cases 页面查看

---

## 完整文件清单

### 新建（~33 个文件）

| 文件 | 说明 |
|------|------|
| `packages/ai/package.json` | AI 包配置 |
| `packages/ai/tsconfig.json` | TS 配置 |
| `packages/ai/tsup.config.ts` | 构建配置 |
| `packages/ai/src/index.ts` | 统一导出 |
| `packages/ai/src/crypto.ts` | API Key 加密/解密 |
| `packages/ai/src/models/index.ts` | 模型导出 |
| `packages/ai/src/models/ai-config.ts` | AiConfig Zod schemas |
| `packages/ai/src/models/api-endpoint.ts` | ApiEndpoint Zod schemas |
| `packages/ai/src/models/generation.ts` | Generation Zod schemas |
| `packages/ai/src/store/index.ts` | Store 导出 |
| `packages/ai/src/store/repository.ts` | Repository 接口 |
| `packages/ai/src/store/prisma-ai-config.ts` | AiConfig Prisma 实现 |
| `packages/ai/src/store/prisma-api-endpoint.ts` | ApiEndpoint Prisma 实现 |
| `packages/ai/src/store/prisma-generation-task.ts` | GenerationTask Prisma 实现 |
| `packages/ai/src/providers/index.ts` | Provider 导出 |
| `packages/ai/src/providers/types.ts` | LlmProvider 接口 |
| `packages/ai/src/providers/openai-provider.ts` | OpenAI 实现 |
| `packages/ai/src/providers/anthropic-provider.ts` | Anthropic 预留 stub |
| `packages/ai/src/providers/provider-factory.ts` | Provider 工厂 |
| `packages/ai/src/parsers/index.ts` | Parser 导出 |
| `packages/ai/src/parsers/types.ts` | KnowledgeParser 接口 |
| `packages/ai/src/parsers/openapi-parser.ts` | OpenAPI 3.x / Swagger 2.0 解析 |
| `packages/ai/src/parsers/curl-parser.ts` | cURL 命令解析 |
| `packages/ai/src/generation/index.ts` | Generation 导出 |
| `packages/ai/src/generation/strategies.ts` | 策略定义 |
| `packages/ai/src/generation/prompts.ts` | Prompt 模板 |
| `packages/ai/src/generation/generator.ts` | TestCaseGenerator 主引擎 |
| `packages/server/src/routes/ai-config.ts` | AI 配置路由 |
| `packages/server/src/routes/ai-endpoints.ts` | 知识端点路由 |
| `packages/server/src/routes/ai-generation.ts` | 生成路由 |
| `packages/web/src/pages/ai-settings.tsx` | AI 设置页 |
| `packages/web/src/pages/knowledge.tsx` | 知识库页 |
| `packages/web/src/pages/ai-generate.tsx` | 用例生成页 |

### 修改（9 个文件）

| 文件 | 修改内容 |
|------|----------|
| `prisma/schema.prisma` | +3 模型 + Project 反向关系 |
| `packages/server/package.json` | +`@ai-tester/ai` 依赖 |
| `packages/server/src/app.ts` | 注册 3 个新路由 |
| `packages/server/src/services/container.ts` | +AI repo 单例 |
| `packages/web/src/lib/api.ts` | +3 个 API 命名空间 + 新 interface |
| `packages/web/src/App.tsx` | +3 条路由 |
| `packages/web/src/components/layout/sidebar.tsx` | +3 个导航项 |
| `packages/web/src/i18n/locales/en.ts` | +AI 翻译键 |
| `packages/web/src/i18n/locales/zh-CN.ts` | +AI 中文翻译键 |

---

## 验证方案

1. **TypeCheck**: 所有 3 个包（ai, server, web）`typecheck` 通过
2. **Build**: 所有包 `build` 通过
3. **E2E 手动验证**:
   - 配置 OpenAI API Key → 测试连接成功
   - 手动录入 2-3 个 API 端点 → 知识库表格正确显示
   - 粘贴 cURL → 解析并添加成功
   - 选择端点 + comprehensive 策略 → 生成测试用例
   - 预览 → 选择 → 确认入库
   - Test Cases 页面能看到新生成的用例，步骤结构正确
