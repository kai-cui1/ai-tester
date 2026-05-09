# AI-Tester

> AI 驱动的 API 自动化测试平台 —— 用自然语言描述即可生成测试用例。

AI-Tester 是一个面向 API 测试的全栈平台，集成 AI 大模型能力，帮助开发者和测试工程师快速构建、执行和管理 API 测试用例。

## 核心特性

### 测试编排
- **可视化用例编排**：通过表单和流水线视图直观配置测试步骤
- **多步骤类型**：HTTP 请求、断言验证、变量提取、子用例调用、数据集加载
- **变量上下文传递**：步骤间通过模板变量 `{{variableName}}` 共享数据
- **JSONPath 与正则提取**：支持从响应中提取任意字段
- **丰富的断言操作符**：等于、包含、大小比较、正则匹配、存在性检查、类型检查

### AI 能力
- **智能用例生成**：基于知识库中的 API 端点，AI 自动生成覆盖正常路径、异常场景和认证测试的用例
- **多模型支持**：支持 OpenAI、Anthropic 等主流 LLM，可配置多个模型并切换启用
- **服务商管理**：集中管理不同 AI 服务商的配置，支持自定义 OpenAI 兼容端点
- **知识库导入**：支持 OpenAPI 文档、cURL 命令、自由文本三种方式导入 API 信息

### 测试管理
- **项目管理**：按项目组织测试资产，支持多环境配置
- **测试套件**：将用例组合为套件，一键触发批量执行
- **运行中心**：实时查看执行进度，支持请求/响应详情、断言结果、错误日志
- **数据集驱动**：通过 JSON 数据集实现参数化测试

### 国际化
- 支持中文 / English 切换

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19 + Vite + Tailwind CSS + shadcn/ui |
| **后端** | Fastify + TypeScript |
| **数据库** | Prisma ORM + SQLite（开发）/ PostgreSQL（生产） |
| **AI** | OpenAI SDK + Anthropic SDK |
| **构建** | pnpm Workspaces + tsup |
| **测试** | vitest |

## 项目架构

```
ai-tester/
├── packages/
│   ├── core/          # 领域模型、执行引擎、插件注册
│   ├── server/        # Fastify REST API 服务
│   ├── web/           # React 前端应用
│   ├── ai/            # AI 能力（生成、解析、Provider 适配）
│   ├── plugin-api/    # 执行器插件接口（HTTP/断言/提取）
│   └── shared/        # 跨包共享工具（ID 生成、日志、错误类型）
├── prisma/            # 数据库 Schema 与迁移
└── docs/              # 项目文档与使用手册
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```env
DATABASE_URL="file:./dev.db"
AI_TESTER_ENCRYPTION_KEY="your-32-byte-hex-key"
```

> 生成加密密钥：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 初始化数据库

```bash
pnpm prisma migrate dev
```

### 启动开发服务

```bash
pnpm dev
```

启动后访问：
- Web 前端：http://localhost:5173
- API 文档：http://127.0.0.1:3100

## 开发

```bash
# 构建所有包
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 运行测试
pnpm test
```

## 使用流程

### 1. 配置 AI 模型
进入「模型配置」页面，添加你的 LLM 模型（OpenAI、Anthropic 或自定义兼容端点），并设为启用。

### 2. 建立知识库
进入「知识库」，通过以下方式导入 API 信息：
- 粘贴 OpenAPI/Swagger JSON 文档
- 粘贴 cURL 命令
- 用自然语言描述 API（AI 自动解析）

### 3. 生成测试用例
进入「AI 生成」，选择知识库中的端点和生成策略，AI 将自动生成测试用例。

### 4. 编排与执行
在「测试用例」中调整步骤，在「测试套件」中组合用例，然后触发执行并在「运行中心」查看结果。

## 功能截图

详见 `docs/80-使用手册/user-manual.html`（可直接在浏览器中打开）。

## 项目状态

当前处于 MVP 阶段，已实现核心功能闭环：

| 模块 | 状态 |
|------|------|
| 项目管理 | ✅ 可用 |
| 测试用例 CRUD | ✅ 可用 |
| 测试套件 | ✅ 可用 |
| 执行引擎（串行） | ✅ 可用 |
| 断言引擎 | ✅ 可用 |
| 变量提取器 | ✅ 可用 |
| AI 用例生成 | ✅ 可用 |
| 知识库导入 | ✅ 可用 |
| 多模型管理 | ✅ 可用 |
| 服务商管理 | ✅ 可用 |
| 数据集 | ✅ 可用 |

## 后续规划

- [ ] 执行引擎并行化
- [ ] WebSocket 实时推送执行进度
- [ ] 测试报告导出（HTML/PDF）
- [ ] CI/CD 集成（GitHub Actions / GitLab CI）
- [ ] 认证授权体系（JWT）

## License

MIT
