# AI-Tester 架构设计 & MVP 实施计划

## Context

在 AI 编码时代，需要一个与 AI coding agent 配合使用的自动化测试工具，实现测试用例设计、管理、执行、数据管理及结果反馈的闭环。当前项目目录为空，从零构建。

**MVP 范围**: 核心模型 + HTTP 接口测试执行器 + 用例管理模块 + REST API 服务 + Web UI 管理后台

---

## 1. 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 运行时 | Node.js (ESM) + TypeScript 5.5+ strict | 用户指定 |
| 包管理 | pnpm workspaces (monorepo) | 最严格的依赖管理，最快的安装速度 |
| 构建 | tsup (esbuild-based) | 快速构建 library 和 CLI |
| Web 框架 | Fastify 5 | schema-first + Zod type provider，自动生成 OpenAPI |
| 前端框架 | React + Vite | 生态成熟，与管理后台场景匹配 |
| UI 组件库 | shadcn/ui (Radix + Tailwind CSS) | 模块化、美观、可定制 |
| 数据库 | SQLite (默认) / PostgreSQL (可选) | 零配置本地开发，团队协作可切换 PG |
| ORM | Prisma | 类型安全，迁移工具优秀，同时支持 SQLite 和 PG |
| 数据验证 | Zod | 运行时校验 + TS 类型推断 + Fastify 集成 |
| HTTP 客户端 | undici (Node.js 内置) | 零依赖，高性能 |
| 日志 | pino | 最快的 Node.js logger，Fastify 原生集成 |
| ID 生成 | @paralleldrive/cuid2 | 碰撞安全，URL 友好，可排序 |
| JSONPath | jsonpath-plus | 从 API 响应中提取值 |
| 测试框架 | vitest | 快速，ESM 原生，TS 支持好 |

---

## 2. 项目结构 (pnpm Monorepo)

```
ai-tester/
├── pnpm-workspace.yaml
├── package.json                    # root: scripts, devDeps
├── tsconfig.base.json
├── packages/
│   ├── core/                       # @ai-tester/core - 核心引擎
│   │   └── src/
│   │       ├── models/             # Zod schemas (数据模型)
│   │       ├── engine/             # 测试执行编排器
│   │       ├── plugins/            # 插件注册中心 & Executor 接口
│   │       ├── store/              # 存储抽象层 (Repository 模式)
│   │       └── index.ts
│   │
│   ├── server/                     # @ai-tester/server - Fastify REST API
│   │   └── src/
│   │       ├── routes/             # 路由模块
│   │       ├── services/           # 业务逻辑 (调用 core)
│   │       └── app.ts
│   │
│   ├── web/                        # @ai-tester/web - React 管理后台
│   │   └── src/
│   │       ├── components/         # UI 组件
│   │       ├── pages/              # 页面
│   │       ├── hooks/              # 自定义 hooks
│   │       ├── services/           # API 调用
│   │       └── main.tsx
│   │
│   ├── plugin-api/                 # @ai-tester/plugin-api - HTTP/API 测试执行器
│   │   └── src/
│   │       ├── http-executor.ts    # HTTP 请求执行器
│   │       ├── assertions.ts       # 断言引擎
│   │       ├── extractors.ts       # 变量提取
│   │       └── index.ts
│   │
│   └── shared/                     # @ai-tester/shared - 公共工具
│       └── src/
│           ├── errors.ts           # 错误类定义
│           ├── logger.ts           # pino logger 封装
│           ├── config.ts           # 配置加载
│           └── index.ts
│
├── prisma/                         # Prisma schema & migrations
│   └── schema.prisma
│
└── docker/
    └── docker-compose.yml
```

**关键架构原则**: `core` 是纯业务逻辑，不依赖 HTTP/CLI/MCP。所有消费者 (server, web, 未来的 cli/mcp) 都通过 `core` 提供的接口操作。依赖单向流入核心。

---

## 3. 核心领域模型

> 以下模型经过逐项讨论确认，每个决策点标注了 [决策] 标签。

### 3.1 Project (项目)

顶层容器，包含环境配置。

```typescript
{
  id:            string (cuid2)
  name:          string
  description?:  string
  environments:  Array<{
    name:        string                   // "dev" | "staging" | "prod" 或自定义
    baseUrl:     string
    variables:   Record<string, string>
  }>
  createdAt:     DateTime
  updatedAt:     DateTime
}
```

### 3.2 TestCase (测试用例)

[决策] 用例由一组**有序的原子步骤**组成，每个步骤是不可分割的单一操作。
[决策] `module` 是路径字符串属性（如 `"user/auth"`），不是独立实体，用于树形目录组织。
[决策] 用例可以通过 `call` 类型步骤调用其他用例，被调用用例共享调用方的上下文变量。

```typescript
{
  id:            string (cuid2)
  projectId:     string (FK -> Project)
  name:          string
  description?:  string
  module:        string                   // 路径字符串，如 "user/auth", 用于树形组织
  tags:          string[]                 // 横向分类标签
  priority:      "critical" | "high" | "medium" | "low"
  steps:         TestStep[]               // 有序原子步骤列表
  variables:     Record<string, string>   // 用例级静态默认变量
  version:       number                   // 每次修改自增
  createdAt:     DateTime
  updatedAt:     DateTime
}
```

### 3.3 TestStep (测试步骤 — 原子操作)

[决策] 每个 Step 是**一个原子操作**: 一次 HTTP 请求、一个断言、一次变量提取、一次子用例调用、或一次数据集加载。不混合。
[决策] 断言是**独立的 Step 类型**，不内嵌在请求步骤中。
[决策] `config` 是多态的 JSON 对象，由对应类型的 Executor 通过各自的 Zod schema 校验。

```typescript
{
  id:                string (cuid2)
  name:              string
  type:              StepType             // 见下方枚举
  config:            JsonObject           // 由对应 executor 校验，结构见下方各类型说明
  order:             number               // 执行顺序
  continueOnFailure: boolean              // 失败后是否继续执行后续步骤
  retryCount:        number               // 失败重试次数 (默认 0)
}
```

**MVP 步骤类型枚举 (StepType)**:

| type | 说明 | config 结构 |
|------|------|-------------|
| `"http"` | 发送一次 HTTP 请求 | `{ method, url, headers?, body?, timeout?, contentType? }` |
| `"assertion"` | 执行一个断言验证 | `{ source, expression?, operator, expected }` |
| `"extract"` | 从上一个响应/上下文中提取变量 | `{ source, expression, variableName }` |
| `"call"` | 调用另一个测试用例 | `{ testCaseId }` |
| `"load-dataset"` | 加载数据集到上下文 | `{ datasetId, variableName }` |

**各类型 config 详细说明**:

```typescript
// HTTP 请求步骤
HttpStepConfig {
  method:       "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
  url:          string          // 支持模板: "{{baseUrl}}/api/users/{{userId}}"
  headers?:     Record<string, string>
  body?:        any             // JSON body, 支持模板变量
  contentType?: string          // 默认 "application/json"
  timeout?:     number          // ms, 默认 30000
}

// 断言步骤
// [决策] source 指定从哪里取值: 上一个 HTTP 响应的各部分 或 上下文变量
AssertionStepConfig {
  source:       "status" | "header" | "body" | "jsonpath" | "variable"
  expression?:  string          // JSONPath 表达式或 header 名或变量名
  operator:     "equals" | "not_equals" | "contains" | "not_contains"
                | "gt" | "gte" | "lt" | "lte"
                | "matches"     // 正则匹配
                | "exists" | "not_exists"
                | "type_is"     // 类型检查: string, number, boolean, array, object
  expected?:    any             // 期望值, 支持模板变量
}

// 变量提取步骤
ExtractStepConfig {
  source:       "body" | "jsonpath" | "header" | "status" | "regex"
  expression:   string          // JSONPath/正则/header名
  variableName: string          // 存入上下文的变量名
}

// 子用例调用步骤
// [决策] 被调用用例共享调用方的 RunContext，变量双向可见
CallStepConfig {
  testCaseId:   string          // 被调用用例的 ID
}

// 数据集加载步骤
// [决策] 将数据集所有行作为数组加载到上下文变量中，由用例内部逻辑控制迭代
LoadDatasetStepConfig {
  datasetId:    string          // 数据集 ID
  variableName: string          // 加载后存入上下文的变量名 (值为行数组)
}
```

### 3.4 TestSuite (测试套件)

[决策] 套件是用例的有序集合，支持配置 setup/teardown 用例。
[决策] 一次 Run = 执行一个套件。

```typescript
{
  id:              string (cuid2)
  projectId:       string (FK -> Project)
  name:            string
  description?:    string
  testCaseIds:     string[]               // 有序的用例 ID 列表
  parallelism:     number                 // 并行度 (默认 1 = 串行)
  environment?:    string                 // 使用哪个环境配置
  variables:       Record<string, string> // 套件级变量覆盖
  setupCaseId?:    string                 // 套件执行前运行的前置用例
  teardownCaseId?: string                 // 套件执行后运行的后置用例
  createdAt:       DateTime
  updatedAt:       DateTime
}
```

### 3.5 TestRun (测试执行记录 — 套件级)

[决策] 一次 Run 对应一次套件执行，内含多个 TestCaseResult。

```typescript
{
  id:              string (cuid2)
  suiteId:         string (FK -> TestSuite)
  status:          "pending" | "running" | "passed" | "failed" | "error" | "cancelled"
  environment:     string
  variables:       Record<string, string>  // 本次执行的已解析变量
  caseResults:     TestCaseResult[]        // 套件中每个用例的执行结果
  startedAt:       DateTime
  finishedAt?:     DateTime
  durationMs?:     number
  // 统计摘要
  totalCases:      number
  passedCases:     number
  failedCases:     number
  triggeredBy:     "manual" | "api" | "mcp"
  createdAt:       DateTime
}
```

### 3.6 TestCaseResult (用例执行结果 — Run 内的单个用例)

一次 Run 中每个用例独立记录结果。

```typescript
{
  id:              string (cuid2)
  runId:           string (FK -> TestRun)
  testCaseId:      string (FK -> TestCase)
  testCaseName:    string                  // 冗余存储，方便展示
  status:          "passed" | "failed" | "error" | "skipped"
  stepResults:     TestStepResult[]        // 该用例内每个步骤的结果
  startedAt:       DateTime
  finishedAt?:     DateTime
  durationMs?:     number
  // 统计摘要
  totalSteps:      number
  passedSteps:     number
  failedSteps:     number
}
```

### 3.7 TestStepResult (步骤执行结果 — 最细粒度)

```typescript
{
  id:              string (cuid2)
  caseResultId:    string (FK -> TestCaseResult)
  stepId:          string
  stepName:        string
  stepType:        StepType
  status:          "passed" | "failed" | "error" | "skipped"
  // HTTP 步骤特有
  request?:        { method, url, headers, body }
  response?:       { status, headers, body, responseTimeMs }
  // 断言步骤特有
  assertion?:      { expression, operator, expected, actual, passed }
  // 提取步骤特有
  extractedVar?:   { variableName, value }
  // 通用
  error?:          { message, stack }
  durationMs:      number
}
```

### 3.8 TestDataSet (测试数据集)

```typescript
{
  id:              string (cuid2)
  projectId:       string (FK -> Project)
  name:            string
  description?:    string
  // 字段定义
  fields:          Array<{
    name:          string          // 字段名
    type:          "string" | "number" | "boolean" | "email" | "uuid" | "date" | "custom"
  }>
  // 数据行
  rows:            Record<string, any>[]
  createdAt:       DateTime
  updatedAt:       DateTime
}
```

### 3.9 实体关系总览

```
Project (1)
  ├── (N) TestCase        [projectId]     通过 module 路径分组
  │       └── (N) TestStep                有序原子步骤
  │             ├── type=call  ──────────> TestCase (引用其他用例)
  │             └── type=load-dataset ──> TestDataSet (引用数据集)
  ├── (N) TestSuite       [projectId]     用例的有序集合
  │       ├── setupCaseId ──────────────> TestCase (前置用例)
  │       ├── teardownCaseId ───────────> TestCase (后置用例)
  │       └── testCaseIds ──────────────> TestCase[] (包含的用例)
  ├── (N) TestDataSet     [projectId]     测试数据集
  └── (N) TestRun         [suiteId]       套件执行记录
          └── (N) TestCaseResult          每个用例的结果
                └── (N) TestStepResult    每个步骤的结果
```

---

## 4. 插件/执行器系统

### Executor 接口 (`packages/core/src/plugins/executor.ts`)
```typescript
interface Executor {
  readonly type: StepType;                      // "http" | "assertion" | "extract" | "call" | "load-dataset"
  readonly configSchema: ZodSchema;             // 步骤 config 的校验 schema
  execute(step: TestStep, context: RunContext): Promise<StepExecutionResult>;
  setup?(context: RunContext): Promise<void>;   // 可选：执行前初始化
  teardown?(context: RunContext): Promise<void>;// 可选：执行后清理
}
```

### PluginRegistry (`packages/core/src/plugins/registry.ts`)
- `register(executor)`: 注册执行器
- `get(type)`: 按类型查找执行器
- 启动时自动注册内置执行器 (http, assertion, extract, call, load-dataset)

### RunContext (执行上下文)

[决策] 子用例调用时共享同一个 RunContext，变量双向可见。

```typescript
RunContext {
  runId:          string
  environment:    { name, baseUrl, variables }
  variables:      Map<string, any>        // 可变，步骤可读写
  lastResponse?:  HttpResponse            // 最近一次 HTTP 请求的响应，供 assertion/extract 使用
  eventEmitter:   EventEmitter            // step:start, step:complete, case:start, case:complete, run:complete
  logger:         Logger
  
  resolveTemplate(template: string): string  // "{{baseUrl}}/users/{{userId}}" -> 解析后的字符串
}
```

### 编排流程

```
Run 请求 (suiteId + environment)
  │
  ▼
1. 创建 TestRun (status: pending)
2. 加载 Suite，解析 environment，合并变量，创建 RunContext
3. [如有 setupCaseId] 执行 setup 用例
  │
  ▼
4. 遍历 Suite.testCaseIds，对每个用例:
   ├── 创建 TestCaseResult (status: running)
   ├── 加载 TestCase，遍历其 steps:
   │     ├── 查找 executor = registry.get(step.type)
   │     ├── 校验 step.config (executor.configSchema)
   │     ├── 执行 executor.execute(step, context)
   │     │     ├── type=http:          发 HTTP 请求，结果存入 context.lastResponse
   │     │     ├── type=assertion:     从 lastResponse/variables 取值并断言
   │     │     ├── type=extract:       从 lastResponse 提取值存入 context.variables
   │     │     ├── type=call:          递归编排：加载目标 TestCase，执行其 steps (共享 context)
   │     │     └── type=load-dataset:  加载数据集行数组到 context.variables[variableName]
   │     ├── 记录 TestStepResult，发射事件
   │     └── 失败处理: retryCount > 0 ? 重试 : continueOnFailure ? 继续 : 中止该用例
   └── 完成 TestCaseResult (status: passed/failed/error)
  │
  ▼
5. [如有 teardownCaseId] 执行 teardown 用例
6. 汇总统计，更新 TestRun (status: passed/failed/error)
```

---

## 5. REST API 设计

**Base path**: `/api/v1`

| Method | Path | 描述 |
|--------|------|------|
| `POST` | `/projects` | 创建项目 |
| `GET` | `/projects` | 项目列表 |
| `GET` | `/projects/:id` | 项目详情 |
| `PUT` | `/projects/:id` | 更新项目 |
| `DELETE` | `/projects/:id` | 删除项目 |
| `POST` | `/projects/:pid/test-cases` | 创建用例 |
| `GET` | `/projects/:pid/test-cases` | 用例列表 (支持 tag/type/priority/search 过滤) |
| `GET` | `/test-cases/:id` | 用例详情 (含 steps) |
| `PUT` | `/test-cases/:id` | 更新用例 |
| `DELETE` | `/test-cases/:id` | 删除用例 |
| `POST` | `/test-cases/:id/duplicate` | 克隆用例 |
| `POST` | `/projects/:pid/suites` | 创建套件 |
| `GET` | `/projects/:pid/suites` | 套件列表 |
| `GET` | `/suites/:id` | 套件详情 |
| `PUT` | `/suites/:id` | 更新套件 |
| `DELETE` | `/suites/:id` | 删除套件 |
| `POST` | `/runs` | 触发执行 (body: suiteId 或 testCaseId + environment) |
| `GET` | `/runs` | 执行记录列表 |
| `GET` | `/runs/:id` | 执行详情 (含步骤结果) |
| `POST` | `/runs/:id/cancel` | 取消执行 |
| `GET` | `/health` | 健康检查 |

**WebSocket**: `ws://host/ws/runs/:id` — 实时推送步骤执行结果

**响应格式**:
- 成功: `{ data: T, meta?: { total, page, pageSize } }`
- 错误: `{ error: { code: string, message: string, details?: any } }`

---

## 6. Web UI 管理后台

技术: React + Vite + shadcn/ui + Tailwind CSS + TanStack Query + React Router

### 页面结构
1. **Dashboard** — 项目概览、最近执行结果统计
2. **项目管理** — CRUD 项目、环境配置
3. **用例管理** — 用例列表/搜索/过滤、用例编辑器 (步骤可视化编辑)
4. **套件管理** — 组织用例为套件
5. **执行中心** — 触发执行、查看实时进度、历史执行记录
6. **执行详情** — 每个步骤的 request/response、断言结果、时间线

### 关键交互
- 用例步骤的拖拽排序
- HTTP 请求的可视化构建 (类似 Postman 的表单式编辑)
- 执行结果的实时流式展示 (WebSocket)
- 断言结果的 pass/fail 可视化

---

## 7. MVP 实施步骤

### Step 1: 初始化 Monorepo 骨架
- 创建 `pnpm-workspace.yaml`、root `package.json`、`tsconfig.base.json`
- 初始化所有 packages 的 `package.json` 和 `tsconfig.json`
- 配置 ESLint + Prettier
- 配置 tsup 构建

**关键文件**:
- `/pnpm-workspace.yaml`
- `/package.json`
- `/tsconfig.base.json`
- `/packages/*/package.json`
- `/packages/*/tsconfig.json`

### Step 2: shared 包 — 公共基础设施
- 错误类 (AppError, NotFoundError, ValidationError)
- Logger 封装 (pino)
- 配置加载器
- ID 生成工具 (cuid2)

**关键文件**:
- `/packages/shared/src/errors.ts`
- `/packages/shared/src/logger.ts`
- `/packages/shared/src/config.ts`
- `/packages/shared/src/id.ts`

### Step 3: core 包 — 数据模型
- 所有 Zod schemas (Project, TestCase, TestStep, TestSuite, TestRun, TestStepResult)
- TypeScript 类型导出

**关键文件**:
- `/packages/core/src/models/project.ts`
- `/packages/core/src/models/test-case.ts`
- `/packages/core/src/models/test-step.ts`
- `/packages/core/src/models/test-suite.ts`
- `/packages/core/src/models/test-run.ts`

### Step 4: Prisma schema & 存储层
- 编写 Prisma schema (SQLite 为默认)
- 初始化迁移
- 实现 Repository 接口和 Prisma 实现

**关键文件**:
- `/prisma/schema.prisma`
- `/packages/core/src/store/repository.ts`
- `/packages/core/src/store/prisma-*.ts`

### Step 5: 插件系统 & API 测试执行器
- Executor 接口定义
- PluginRegistry 实现
- RunContext 实现
- plugin-api: HTTP 执行器 (undici)
- plugin-api: 断言引擎 (状态码、JSONPath、Header、响应时间)
- plugin-api: 变量提取器

**关键文件**:
- `/packages/core/src/plugins/executor.ts`
- `/packages/core/src/plugins/registry.ts`
- `/packages/core/src/engine/run-context.ts`
- `/packages/core/src/engine/orchestrator.ts`
- `/packages/plugin-api/src/http-executor.ts`
- `/packages/plugin-api/src/assertions.ts`
- `/packages/plugin-api/src/extractors.ts`

### Step 6: REST API Server
- Fastify 应用配置 (Zod type provider, CORS, error handler)
- 所有 CRUD 路由 (projects, test-cases, suites, runs)
- 测试执行触发和状态查询
- WebSocket 实时推送
- 自动生成 OpenAPI 文档

**关键文件**:
- `/packages/server/src/app.ts`
- `/packages/server/src/routes/projects.ts`
- `/packages/server/src/routes/test-cases.ts`
- `/packages/server/src/routes/suites.ts`
- `/packages/server/src/routes/runs.ts`

### Step 7: Web UI 管理后台
- Vite + React 初始化
- shadcn/ui + Tailwind 配置
- 页面路由和布局
- API 服务层 (TanStack Query)
- Dashboard、项目管理、用例管理、套件管理、执行中心页面
- 用例步骤可视化编辑器
- 执行结果实时展示

**关键文件**:
- `/packages/web/src/main.tsx`
- `/packages/web/src/pages/`
- `/packages/web/src/components/`
- `/packages/web/src/services/api.ts`

### Step 8: 集成测试 & 端到端验证
- 核心引擎单元测试 (vitest)
- API 路由集成测试
- 完整流程验证: 创建项目 -> 创建用例 -> 执行 -> 查看结果

---

## 8. 验证方案

1. **单元测试**: `pnpm --filter @ai-tester/core test` — 验证模型校验、执行器、编排器
2. **API 测试**: `pnpm --filter @ai-tester/server test` — 验证 REST API 端点
3. **端到端验证**:
   - 启动 server: `pnpm --filter @ai-tester/server dev`
   - 启动 web: `pnpm --filter @ai-tester/web dev`
   - 通过 Web UI 创建项目 -> 创建 HTTP 测试用例 -> 执行 -> 查看结果
   - 通过 curl 调用 REST API 完成同样流程
4. **构建验证**: `pnpm build` — 所有包成功构建，无 TypeScript 错误
