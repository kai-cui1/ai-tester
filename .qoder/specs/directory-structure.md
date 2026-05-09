# AI-Tester 目录结构规范

## 一、Monorepo 顶层结构

```
ai-tester/
├── packages/          # 所有子包
│   ├── core/          # 核心业务逻辑
│   ├── server/        # Fastify 后端
│   ├── web/           # React 前端
│   ├── ai/            # AI 能力（生成、解析）
│   ├── plugin-api/    # 插件接口定义
│   └── shared/        # 跨包共享工具
├── prisma/            # 数据库 Schema（全局唯一）
├── docs/              # 项目文档
└── .qoder/            # AI 辅助规范
```

## 二、各子包内部结构规范

### 1. packages/server

```
packages/server/src/
├── app.ts              # 入口，只做启动和注册
├── routes/             # 路由定义（按资源分文件）
├── services/           # 业务逻辑（从 route handler 中抽离）
├── middleware/         # Fastify 中间件/钩子
├── types/              # 请求/响应类型定义
└── utils/              # 服务端工具函数
```

### 2. packages/core

```
packages/core/src/
├── index.ts            # 统一导出
├── models/             # 领域模型（纯类型+业务规则）
├── engine/             # 执行引擎
├── plugins/            # 插件注册与接口
└── store/              # 数据仓储（Prisma 实现）
    ├── repository.ts   # 抽象接口
    ├── prisma-*.ts     # 具体实现
    └── index.ts
```

### 3. packages/ai

```
packages/ai/src/
├── index.ts
├── generation/         # 用例生成策略
├── models/             # AI 相关模型定义
├── parsers/            # OpenAPI/cURL 解析器
├── providers/          # LLM Provider 适配
├── store/              # AI 相关数据仓储
└── crypto.ts           # 加密工具
```

### 4. packages/web

```
packages/web/src/
├── main.tsx
├── App.tsx
├── pages/              # 页面组件（按功能分文件）
├── components/         # 可复用组件
│   ├── layout/         # 布局组件
│   ├── pipeline/       # 流水线组件
│   ├── ui/             # 基础 UI 组件
│   └── features/       # 业务特性组件
├── hooks/              # 自定义 Hooks
├── lib/                # 工具与 API 客户端
├── i18n/               # 国际化
└── types/              # 前端类型定义
```

### 5. packages/shared

```
packages/shared/src/
├── index.ts            # 统一导出
├── errors.ts           # 错误类型
├── logger.ts           # 日志
├── id.ts               # ID 生成
├── constants.ts        # 全局常量
└── types.ts            # 跨包共享类型
```

### 6. packages/plugin-api

```
packages/plugin-api/src/
├── index.ts            # 统一导出
├── assertions.ts       # 断言 API
├── extractors.ts       # 提取器 API
└── http-executor.ts    # HTTP 执行器 API
```

## 三、核心原则

1. **按职责分包** - 每个包有明确的单一职责（core=业务、server=HTTP、ai=AI能力、web=UI）
2. **按资源分文件** - routes/store/models 按业务实体（project、test-case）拆分文件
3. **依赖方向单向** - web → server → core/shared、ai → core/shared，禁止反向依赖
4. **统一导出** - 每个包的 `src/index.ts` 作为公共 API 边界，禁止直接引用子文件
5. **测试就近** - 测试文件 `*.test.ts` 与源文件同目录，不单独建 `__tests__/`
6. **Prisma 集中管理** - Schema 只在根目录 `prisma/`，store 层通过 `prisma-client.ts` 统一引用

## 四、命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 领域模型文件 | kebab-case | `test-case.ts`、`test-run.ts` |
| 仓储实现文件 | `prisma-{entity}.ts` | `prisma-project.ts` |
| 路由文件 | kebab-case（资源名） | `test-cases.ts`、`runs.ts` |
| 页面文件 | kebab-case | `test-cases.tsx`、`run-detail.tsx` |
| 组件文件 | kebab-case | `step-editor.tsx` |
| 工具文件 | kebab-case | `curl-parser.ts`、`utils.ts` |
| 目录名 | kebab-case | `generation/`、`providers/` |
