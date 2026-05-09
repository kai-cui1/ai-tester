# AI-Tester 项目计划

> 最后更新：2026-04-24

## 项目愿景

AI-Tester 是一个与 AI Coding Agent 配合使用的自动化 API 测试工具，目标是形成 **"导入 API 知识 → AI 自动生成用例 → 用户审核 → 直接执行 → 结果反馈给 Coding Agent"** 的完整闭环。

---

## 当前状态总览

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目/用例/套件/运行 CRUD | ✅ 已完成 | 完整的 REST API + Web UI |
| HTTP 测试执行引擎 | ✅ 已完成 | plugin-api 包，支持 http/assertion/extract/call/load-dataset |
| Web UI 管理后台 | ✅ 已完成 | React 19 + shadcn/ui + TanStack Query |
| 插件化执行器架构 | ✅ 已完成 | Executor 接口 + PluginRegistry |
| i18n 国际化 | ✅ 已完成 | react-i18next，中英双语 |
| AI 配置 + 知识库 + 用例生成 | ✅ 已完成 | packages/ai 包，OpenAI Provider + 多源解析 |
| 认证授权体系 | ❌ 未实现 | 当前所有 API 无认证（P0 待补齐） |
| 步骤编辑器 UX 改进 | ❌ 未实现 | 字段无标签、下拉显示裸技术名、call/load-dataset 需手动输入 ID |
| MCP Server 对接 | ❌ 未实现 | 阶段 2 目标 |
| 深度代码理解 | ❌ 未实现 | 阶段 3 目标 |

---

## 产品路线图

```
阶段 1 (当前)    AI 用例生成 + MVP 增强
  ├─ 1.1  规格评审问题修复（安全 + 异步 + 密钥管理）
  ├─ 1.2  步骤编辑器 UX 改进
  ├─ 1.3  MVP 增强功能（拖拽排序、WebSocket 推送等）
  └─ 1.4  质量保障（集成测试、Docker 部署）
       │
阶段 2           MCP Server + Coding Agent 对接
  ├─ 2.1  MCP Server 实现
  ├─ 2.2  测试结果结构化输出
  └─ 2.3  Coding Agent 集成协议
       │
阶段 3           深度代码理解 + 智能增强
  ├─ 3.1  代码仓库分析
  ├─ 3.2  智能用例推荐
  └─ 3.3  回归测试策略自动生成
```

---

## 阶段 1：AI 用例生成 + MVP 增强

### 1.1 规格评审问题修复

> 来源：`docs/review-report/specs-review-2026-04-24.md`

#### 1.1.1 认证授权体系（P0 — 严重度：高）

**问题**：所有 REST API 端点无任何认证机制，生产环境不可用。

**方案**（按阶段推进）：
- **MVP**：API Key 认证（请求头 `X-API-Key`），单用户场景够用
  - 服务端启动时从环境变量 `API_KEY` 读取
  - Fastify 全局 hook 校验，`/health` 除外
  - WebSocket 连接通过 query param 传 token
- **V2**：JWT + 用户系统（注册/登录/RBAC）

**涉及文件**：
- `packages/server/src/middleware/auth.ts`（新建）
- `packages/server/src/app.ts`（注册 auth hook）
- `.env`（新增 `API_KEY` 变量）

**预估工期**：2 天

---

#### 1.1.2 加密密钥管理（P0 — 严重度：高）

**问题**：AES-256-GCM 加密 API Key，但密钥来源未定义。

**方案**：
- 从环境变量 `ENCRYPTION_KEY` 读取（>= 32 字节）
- 启动时校验密钥有效性，缺失时拒绝启动并给出明确错误提示
- 生产环境推荐集成 KMS（AWS KMS / Vault），MVP 阶段用环境变量

**涉及文件**：
- `packages/ai/src/crypto.ts`（修改，增加密钥校验）
- `.env`（新增 `ENCRYPTION_KEY` 变量）
- `packages/server/src/app.ts`（启动时校验）

**预估工期**：0.5 天

---

#### 1.1.3 LLM 生成异步化（P0 — 严重度：高）

**问题**：`POST /ai/generate` 同步等待 LLM 返回，可能 30-120 秒超时。

**方案**：
- 改为异步模式：提交任务立即返回 `taskId` + `status: pending`
- 前端通过轮询 (`GET /ai/tasks/:id`) 获取进度
- 服务端 LLM 调用在后台执行，利用已有 `GenerationTask.status` 状态机

**涉及文件**：
- `packages/server/src/routes/ai-generation.ts`（修改为异步）
- `packages/web/src/pages/ai-generate.tsx`（改为轮询模式）
- `packages/web/src/lib/api.ts`（适配异步 API）

**预估工期**：2 天

---

#### 1.1.4 其他评审问题修复

| 问题 | 严重度 | 方案 | 预估工期 |
|------|--------|------|----------|
| WebSocket 安全机制 | 中 | 连接鉴权 + 速率限制 + 连接数限制 | 1 天 |
| call 步骤递归深度限制 | 中 | 最大调用深度 10 层，超出报错 | 0.5 天 |
| load-dataset 迭代语义 | 中 | 编排器支持 for-each 语义 | 1 天 |
| 并发控制 | 中 | parallelism > 1 时 RunContext 隔离 | 1 天 |
| Prompt 注入防护 | 中 | 用户输入 sanitization + system/user 角色隔离 | 0.5 天 |
| Token 消耗预算控制 | 中 | 单次/每日 token 上限配置 | 0.5 天 |
| 路由命名规范统一 | 低 | 全部统一为 `/api/v1` 前缀 | 0.5 天 |

**小计**：约 4.5 天

---

### 1.2 步骤编辑器 UX 改进

> 来源：`.qoder/specs/step-editor-ux-improvement.md`

| 步骤 | 内容 | 预估工期 |
|------|------|----------|
| Step 1 | 创建 Tooltip 组件（封装已安装的 @radix-ui/react-tooltip） | 0.5 天 |
| Step 2 | 创建 SearchableSelect 组件（纯 Tailwind + 原生实现） | 1 天 |
| Step 3 | 添加 i18n 翻译键（~55 个中英文翻译） | 0.5 天 |
| Step 4 | 操作按钮 Tooltip 改造 | 0.5 天 |
| Step 5 | 通用选项行（continueOnFailure + retryCount） | 0.5 天 |
| Step 6 | HTTP 步骤 UI 改造（标签 + 帮助文本） | 0.5 天 |
| Step 7 | 断言步骤 UI 改造（人类可读下拉 + 动态帮助） | 1 天 |
| Step 8 | 变量提取步骤 UI 改造 | 0.5 天 |
| Step 9 | 子用例调用步骤（SearchableSelect 替换手动 ID） | 0.5 天 |
| Step 10 | 加载数据集步骤（SearchableSelect + 帮助文本） | 0.5 天 |
| Step 11 | TypeCheck + Build 验证 | 0.5 天 |

**小计**：约 6.5 天

---

### 1.3 MVP 增强功能

| 功能 | 优先级 | 说明 | 预估工期 |
|------|--------|------|----------|
| 用例步骤拖拽排序 | P1 | 替换现有上移/下移按钮，支持拖拽重排步骤顺序 | 2 天 |
| HTTP 请求可视化构建 | P1 | 类 Postman 表单式编辑（Headers KV 编辑器、Body 编辑器） | 3 天 |
| WebSocket 实时结果推送 | P1 | 执行过程中步骤结果实时推送到前端 | 2 天 |
| 数据集字段定义功能 | P1 | 当前数据集仅支持 JSON 行，增加字段 Schema 定义 | 1 天 |
| OpenAPI 文档自动生成 | P2 | 基于 Fastify 路由自动生成 OpenAPI 文档 | 1 天 |
| setup/teardown 支持 | P2 | 套件级前置/后置用例执行 | 1 天 |
| 执行取消功能 | P2 | 运行中的测试可取消 | 1 天 |

**小计**：约 11 天

---

### 1.4 质量保障

| 任务 | 说明 | 预估工期 |
|------|------|----------|
| 核心引擎单元测试 | models、engine、plugins 测试覆盖率 > 80% | 3 天 |
| API 集成测试 | 所有 REST 端点集成测试 | 2 天 |
| E2E 测试流程 | 创建项目 → 创建用例 → 执行 → 查看结果 | 1 天 |
| Docker 部署配置 | Dockerfile + docker-compose.yml | 1 天 |
| CI/CD 流水线 | GitHub Actions：lint + typecheck + test + build | 1 天 |

**小计**：约 8 天

---

### 阶段 1 工期汇总

| 模块 | 工期 |
|------|------|
| 1.1 规格评审问题修复 | 9 天 |
| 1.2 步骤编辑器 UX 改进 | 6.5 天 |
| 1.3 MVP 增强功能 | 11 天 |
| 1.4 质量保障 | 8 天 |
| **合计** | **约 34.5 天（7 周）** |

**建议执行顺序**：

```
Week 1-2    1.1 规格评审问题修复（先安全，后功能）
                ├─ 1.1.1 认证授权
                ├─ 1.1.2 密钥管理
                ├─ 1.1.3 LLM 异步化
                └─ 1.1.4 其他修复
Week 3-4    1.2 步骤编辑器 UX 改进
Week 5-6    1.3 MVP 增强功能
Week 7      1.4 质量保障
```

---

## 阶段 2：MCP Server + Coding Agent 对接

> 前置条件：阶段 1 完成且质量保障通过

### 2.1 MCP Server 实现

- 实现 Model Context Protocol Server，暴露测试能力给 AI Agent
- 支持 Tool：创建项目、生成用例、执行测试、查询结果
- 支持 Resource：测试报告、用例列表
- 传输方式：stdio（本地）/ SSE（远程）

**预估工期**：5 天

### 2.2 测试结果结构化输出

- 定义结构化测试报告格式（JSON Schema）
- 支持 JUnit XML 输出（CI 集成）
- 支持精简摘要模式（给 Agent 消费）

**预估工期**：3 天

### 2.3 Coding Agent 集成协议

- 定义 Agent 调用测试的交互协议
- 结果反馈格式：失败用例 → 最小可复现信息
- 与 Cursor/Claude Code 等 Agent 的适配示例

**预估工期**：5 天

**阶段 2 合计**：约 13 天（2.5 周）

---

## 阶段 3：深度代码理解 + 智能增强

> 前置条件：阶段 2 完成，MCP 通道已打通

### 3.1 代码仓库分析

- 接入代码仓库（Git clone / GitHub API）
- AST 分析路由定义、中间件、数据模型
- 自动提取 API 端点信息补充知识库

**预估工期**：10 天

### 3.2 智能用例推荐

- 基于代码变更 diff 自动推荐需回归的测试用例
- 基于历史执行数据推荐高风险用例
- 用例覆盖率分析

**预估工期**：8 天

### 3.3 回归测试策略自动生成

- 根据代码变更范围自动生成回归测试套件
- 优先级排序：critical > high > medium
- 失败用例自动分析原因（环境/代码/数据）

**预估工期**：7 天

**阶段 3 合计**：约 25 天（5 周）

---

## 总体时间线

```
2026 Q2         阶段 1：AI 用例生成 + MVP 增强（7 周）
2026 Q3         阶段 2：MCP Server + Coding Agent 对接（2.5 周）
2026 Q3-Q4      阶段 3：深度代码理解 + 智能增强（5 周）
```

---

## 规格文档索引

| 文档 | 路径 | 状态 |
|------|------|------|
| 架构设计 | `.qoder/specs/ai-tester-architecture.md` | ✅ 已实施 |
| AI 用例生成 | `.qoder/specs/ai-test-generation.md` | ✅ 已实施 |
| i18n 多语言 | `.qoder/specs/i18n-multi-language.md` | ✅ 已实施 |
| 步骤编辑器 UX | `.qoder/specs/step-editor-ux-improvement.md` | ⏳ 待实施 |
| 规格评审报告 | `docs/review-report/specs-review-2026-04-24.md` | ✅ 已完成 |
| 目录结构规范 | `.qoder/specs/directory-structure.md` | ✅ 已发布 |

---

## 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM Provider 稳定性 | 用例生成质量波动 | 支持 fallback provider + 重试机制 |
| SQLite 并发性能 | 多用户场景写入瓶颈 | 阶段 1 完成后评估是否迁移 PostgreSQL |
| MCP 协议演进 | 阶段 2 实现可能需调整 | 持续跟踪 MCP 规范变化 |
| 测试覆盖率不足 | 回归风险 | 阶段 1.4 强制补齐核心测试 |
