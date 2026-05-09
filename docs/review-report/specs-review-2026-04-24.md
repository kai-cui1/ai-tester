# Specs 文件专业评审报告

**评审日期**: 2026-04-24
**评审范围**: `.qoder/specs/` 下全部 4 个规格文档
**评审人**: Claude Code (AI 辅助评审)

---

## 1. ai-tester-architecture.md — 整体架构设计

### 优点
- **分层清晰**: `core -> server -> web` 单向依赖，插件系统设计合理
- **领域模型完整**: 9 个实体覆盖测试全生命周期
- **Executor 插件模式**: 开放扩展点，未来加新步骤类型只需实现接口
- **技术选型务实**: Prisma + Zod + Fastify + shadcn/ui 都是成熟方案

### 问题与风险

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| A1 | **缺少认证/授权设计** | **高** | REST API 无任何 auth 方案（JWT/OAuth/API Key），生产环境不可用 |
| A2 | **WebSocket 缺少安全机制** | 中 | `ws://host/ws/runs/:id` 无鉴权、无速率限制、无连接数限制 |
| A3 | **TestRun 的 caseResults 存储方式未明确** | **高** | 文档中 TestRun 包含 `caseResults: TestCaseResult[]`，如果用 Prisma 存为 JSON 字段则无法单独查询；如果用关联表则文档未明确。需明确存储策略 |
| A4 | **call 步骤的递归深度无限制** | 中 | 子用例调用共享 RunContext，无限递归会导致栈溢出，需设置最大调用深度（如 10 层） |
| A5 | **load-dataset 的迭代逻辑未定义** | 中 | "由用例内部逻辑控制迭代"太模糊——数据集驱动循环是测试框架核心能力，应在编排器中显式支持 for-each 语义 |
| A6 | **缺少并发控制** | 中 | 同一套件 `parallelism > 1` 时，变量竞争、RunContext 隔离策略未定义 |
| A7 | **环境配置存储方式模糊** | 低 | Project.environments 是 JSON 字段还是关联表？影响查询和校验能力 |

### 评级: B+

---

## 2. ai-test-generation.md — AI 测试用例生成

### 优点
- **Provider 抽象层设计好**: `LlmProvider` 接口统一 OpenAI/Anthropic/自定义端点
- **知识源多入口**: OpenAPI / cURL / 手动 / 自由文本，覆盖面广
- **生成预览->确认入库**: 两步确认流程，避免垃圾数据直接入库
- **API Key 加密存储**: 安全意识到位

### 问题与风险

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| B1 | **加密密钥管理缺失** | **高** | AES-256-GCM 加密需要密钥，但 spec 未说明密钥从哪来（环境变量？KMS？硬编码？）。密钥泄露 = 全部 API Key 泄露 |
| B2 | **GenerationTask 同步返回** | **高** | `POST /ai/generate` 同步返回结果。LLM 调用可能耗时 30-120 秒，会阻塞 HTTP 连接/超时。应改为异步（提交任务 -> 轮询/WebSocket 推送） |
| B3 | **generatedCases 存 JSON 字段** | 中 | 预览数据存为 JSON 字符串，无法做结构化查询和分页。且大 payload 可能超过 SQLite 字段限制（默认 1GB，但实际应控制） |
| B4 | **Prompt 注入风险** | 中 | 用户输入的知识文本直接传入 LLM prompt，存在 prompt injection 风险。需对用户输入做 sanitization 或使用 system/user 角色隔离 |
| B5 | **Token 用量无预算控制** | 中 | 无单次/每日 token 消耗上限，恶意或误操作可能产生大量 API 费用 |
| B6 | **ApiEndpoint 结构化字段存 JSON** | 低 | parameters/requestBody/responseBody 存 JSON 字符串，失去数据库层面的约束和索引能力 |
| B7 | **Anthropic stub 预留但不实现** | 低 | P0 只做 OpenAI 可以接受，但 provider 枚举值已包含 `"anthropic"`，前端会展示该选项却无法使用 |

### 评级: B-

---

## 3. i18n-multi-language.md — 多语言支持

### 优点
- **选型正确**: react-i18next 是 React i18n 事实标准
- **TypeScript 类型安全**: `.ts` 格式翻译文件 + 模块增强，编译时就能发现缺失键
- **迁移顺序合理**: 按复杂度从低到高，降低回归风险
- **不翻译术语清单清晰**: 避免过度翻译导致歧义

### 问题与风险

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| C1 | **~235 个键全量迁移风险** | 中 | 一次性替换 235 处字符串，遗漏概率高。建议增加自动化检查（如 `i18next-scanner` 或自定义脚本检测未翻译的硬编码字符串） |
| C2 | **fallbackLng 设为 en 但默认语言是 zh-CN** | 低 | 如果 zh-CN 翻译缺键，fallback 到英文对中文用户不友好。建议 fallbackLng 也设为 `zh-CN` 或确保 zh-CN 翻译完整覆盖所有键 |
| C3 | **日期格式化不够完善** | 低 | 只提到 `toLocaleString()` 加 language 参数，但相对时间（"3 分钟前"）、时区处理等场景未覆盖 |
| C4 | RTL 语言未考虑** | 低 | 当前只支持中英双语无需 RTL，但如果未来扩展需注意布局兼容性（此条标记备查即可） |

> **注**: RTL 语言问题在当前双语言场景下可忽略，标记为未来扩展注意事项。

### 评级: A-

---

## 4. step-editor-ux-improvement.md — 步骤编辑器 UX 改进

### 优点
- **问题诊断准确**: 6 个痛点都是真实用户体验问题
- **渐进式改进**: 每步聚焦一个区域，可独立验证
- **布局紧凑性策略**: 考虑了 Dialog 空间限制，不会让编辑器变得臃肿
- **SearchableSelect 不引入新依赖**: 符合项目轻量原则

### 问题与风险

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| D1 | **SearchableSelect 键盘导航未提及** | 中 | 可搜索下拉框必须支持键盘操作（上下箭头选择、Enter 确认、Escape 关闭），否则无障碍不达标且效率低 |
| D2 | **continueOnFailure 开关自实现** | 低 | 用 `<button role="switch">` 手写可以工作，但若项目已有 shadcn/ui 的 Switch 组件应复用以保持一致性 |
| D3 | **call/load-dataset 步骤的数据获取/缓存策略未明确** | 低 | "仅当 step.type === 'call' 时 fetch 数据"——用户切换类型再切回时是否需要缓存？应明确 |
| D4 | **与 i18n spec 的依赖关系** | 低 | 此 spec 大量新增 i18n 翻译键，必须在 i18n 实施之后或同步实施，否则引用不存在的 key 会报错 |

### 评级: B+

---

## 跨文件交叉问题

| # | 问题 | 涉及文件 | 说明 |
|---|------|----------|------|
| X1 | **实施顺序依赖未声明** | 全部 4 个 | 建议执行顺序: Architecture(基础) -> i18n(基础设施) -> step-editor-ux(UI改进) -> ai-generation(功能扩展)。文档间未显式声明此依赖关系 |
| X2 | **Prisma Schema 冲突风险** | Arch + AI Gen | 两个文件都修改 `schema.prisma`，合并时需注意模型一致性，建议 AI Generation spec 明确基于 Architecture 的 schema 进行增量修改 |
| X3 | **路由命名规范不一致** | Arch + AI Gen | Architecture 用 `/api/v1/projects/:pid/test-cases`（有版本前缀），AI Generation 用 `/projects/:projectId/ai-config`（无 `/api/v1` 前缀）。需统一路由规范 |

---

## 总结评级

| 文件 | 质量 | 主要风险 | 建议优先级 |
|------|------|----------|------------|
| 架构设计 | **B+** | 安全模型缺失、并发语义模糊 | P0 - 作为基础先落地 |
| AI 生成 | **B-** | 密钥管理缺失、同步 LLM 调用会超时 | P1 - 依赖架构落地后实施 |
| i18n | **A-** | 整体扎实，fallback 策略可优化 | P0 - 基础设施，尽早实施 |
| 步骤编辑器 UX | **B+** | 设计细致，键盘无障碍需补强 | P1 - 依赖 i18n 落地后实施 |

---

## 最高优先级修复项 (Top 3 必须修复)

### 1. B1 — 加密密钥管理 (严重度: 高)
**现状**: AES-256-GCM 加密 API Key，但密钥来源未定义。
**建议**:
- 从环境变量 `ENCRYPTION_KEY` 读取（开发/简单部署）
- 生产环境推荐集成 KMS（AWS KMS / Vault）
- 密钥长度必须 >= 32 字节（256 bits）
- 启动时校验密钥有效性，缺失时拒绝启动并给出明确错误提示

### 2. B2 — LLM 异步调用 (严重度: 高)
**现状**: `POST /ai/generate` 同步等待 LLM 返回，可能超时。
**建议**:
- 改为异步模式：提交任务立即返回 `taskId` + `status: pending`
- 前端通过轮询 (`GET /ai/tasks/:id`) 或 WebSocket 推送获取进度
- 服务端设置合理的 HTTP timeout（如 60s），LLM 调用在后台执行
- 利用已有的 `GenerationTask.status` 状态机（pending -> running -> completed/failed）

### 3. A1 — 认证授权体系 (严重度: 高)
**现状**: 所有 API 端点无任何认证机制。
**建议** (按阶段推进):
- **MVP**: 简单 API Key 认证（请求头 `X-API-Key`），单用户场景够用
- **V2**: JWT + 用户系统（注册/登录/RBAC）
- WebSocket 连接必须复用同一认证机制（如 query param 传 token）

---

## 建议的实施路线图

```
Phase 0 (当前)   规格评审与修正
     │
Phase 1          架构落地 (Architecture Spec)
     ├─ Step 1-4: Monorepo + shared + core models + Prisma schema
     └─ [在此阶段补齐: 最小化认证方案 + 加密密钥管理]
     │
Phase 2          国际化基础设施 (i18n Spec)
     ├─ 依赖安装 + 翻译文件 + 语言切换器
     └─ 逐页迁移 + 自动化检查工具
     │
Phase 3          UI 易用性改进 (Step Editor UX Spec)
     ├─ Tooltip + SearchableSelect 组件
     └─ 5 种步骤类型的 UI 改造
     │
Phase 4          AI 测试生成功能 (AI Generation Spec)
     ├─ packages/ai 包 + Provider 层 + 解析器 + 生成引擎
     ├─ 后端 API (改为异步模式!)
     └─ 前端 3 页面 + E2E 验证
```

---

*报告完毕。以上评审基于文档内容的专业分析，具体实施时应结合代码实际情况调整。*
