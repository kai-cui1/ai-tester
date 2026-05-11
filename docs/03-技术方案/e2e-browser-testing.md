# E2E 浏览器测试能力扩展 — 技术方案

> 版本：v1.0
> 日期：2026-04-24
> 状态：待实施

---

## 1. 背景与目标

### 1.1 现状

AI-Tester 当前仅支持 API 接口测试，步骤类型包括：

| 类型 | 说明 | 所属包 |
|------|------|--------|
| `http` | 发送 HTTP 请求 | plugin-api |
| `assertion` | 断言验证 | plugin-api |
| `extract` | 变量提取 | plugin-api |
| `call` | 子用例调用 | core（编排器内置） |
| `load-dataset` | 加载数据集 | core（编排器内置） |

步骤间通过 `RunContext`（`variables` + `lastResponse`）传递数据。

### 1.2 目标

扩展系统支持第三方 Web 系统的 E2E 测试，实现：

- 用例管理：支持浏览器操作步骤的创建、编辑、删除
- 用例执行：基于 Playwright 驱动浏览器，支持导航、交互、断言、变量提取
- 结果展示：展示浏览器操作结果、截图、断言详情

### 1.3 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 步骤粒度 | 方案 A：一步一操作 | 与现有模型一致，粒度细，失败定位精确 |
| 断言/提取方式 | 内聚在 browser 步骤内 | 浏览器断言需先定位元素，与 HTTP 断言机制不同 |
| 浏览器引擎 | Playwright | Node.js 原生、多浏览器支持、API 丰富、社区活跃 |
| 浏览器生命周期 | 用例级别 | 隔离性好，一个用例一个浏览器上下文 |

---

## 2. 领域模型

### 2.1 新增步骤类型

在 `StepType` 枚举中新增 `'browser'`：

```typescript
// packages/core/src/models/test-step.ts
export const StepType = z.enum(['http', 'assertion', 'extract', 'call', 'load-dataset', 'browser']);
```

### 2.2 BrowserStepConfigSchema

```typescript
// packages/core/src/models/test-step.ts

// --- Browser Action 枚举 ---
export const BrowserAction = z.enum([
  'navigate',      // 导航到 URL
  'click',         // 点击元素
  'fill',          // 输入文本
  'select',        // 选择下拉项
  'check',         // 勾选复选框
  'uncheck',       // 取消勾选
  'hover',         // 鼠标悬停
  'wait',          // 等待（元素/超时）
  'screenshot',    // 截图
  'assert',        // 断言
  'extract',       // 提取变量
  'keyboard',      // 键盘操作
  'goBack',        // 浏览器后退
  'goForward',     // 浏览器前进
  'close',         // 关闭页面
]);

// --- Browser Assertion 模型 ---
export const BrowserAssertionType = z.enum([
  'text',        // 元素文本内容
  'value',       // 表单元素值
  'visible',     // 元素可见
  'hidden',      // 元素隐藏
  'url',         // 当前页面 URL
  'title',       // 页面标题
  'attribute',   // 元素属性值
  'count',       // 匹配元素数量
]);

export const BrowserAssertionOperator = z.enum([
  'equals',
  'contains',
  'matches',
]);

export const BrowserAssertionSchema = z.object({
  type: BrowserAssertionType,
  selector: z.string().optional(),       // text/value/visible/hidden/attribute/count 需要
  expected: z.any().optional(),           // text/value/url/title/attribute/count 需要
  operator: BrowserAssertionOperator.default('equals'),
  attribute: z.string().optional(),       // attribute 类型需要，指定属性名
});

// --- BrowserStepConfig ---
export const BrowserStepConfigSchema = z.object({
  action: BrowserAction,

  // navigate
  url: z.string().optional(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),

  // selector-based actions (click/fill/select/check/uncheck/hover/wait/extract)
  selector: z.string().optional(),

  // fill / select
  value: z.string().optional(),

  // fill options
  clear: z.boolean().default(true).optional(),

  // click options
  button: z.enum(['left', 'right', 'middle']).default('left').optional(),
  clickCount: z.number().int().min(1).default(1).optional(),
  force: z.boolean().default(false).optional(),

  // wait options
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional(),
  duration: z.number().positive().optional(),     // 等待时长（ms）
  timeout: z.number().positive().default(30000).optional(),

  // screenshot options
  fullPage: z.boolean().default(false).optional(),

  // extract options
  variableName: z.string().optional(),
  attribute: z.string().optional(),               // 提取元素属性（而非文本）

  // assert
  assertion: BrowserAssertionSchema.optional(),

  // keyboard
  key: z.string().optional(),                     // 如 'Enter', 'Tab', 'Escape', 'Control+a'
});
```

### 2.3 各 Action 必要字段约束

| Action | 必要字段 | 可选字段 | 说明 |
|--------|----------|----------|------|
| `navigate` | `url` | `waitUntil`, `timeout` | 打开 URL |
| `click` | `selector` | `button`, `clickCount`, `force`, `timeout` | 点击元素 |
| `fill` | `selector`, `value` | `clear`, `force`, `timeout` | 输入文本 |
| `select` | `selector`, `value` | `timeout` | 选择下拉项 |
| `check` | `selector` | `force`, `timeout` | 勾选 |
| `uncheck` | `selector` | `force`, `timeout` | 取消勾选 |
| `hover` | `selector` | `force`, `timeout` | 鼠标悬停 |
| `wait` | `selector` 或 `duration` | `state`, `timeout` | 等待元素/超时 |
| `screenshot` | — | `selector`, `fullPage`, `timeout` | 截图 |
| `assert` | `assertion` | `timeout` | 浏览器断言 |
| `extract` | `selector`, `variableName` | `attribute`, `timeout` | 提取变量 |
| `keyboard` | `key` | `timeout` | 键盘操作 |
| `goBack` | — | `timeout` | 后退 |
| `goForward` | — | `timeout` | 前进 |
| `close` | — | — | 关闭页面 |

### 2.4 RunContext 扩展

```typescript
// packages/core/src/engine/run-context.ts

export class RunContext {
  // 已有
  public lastResponse?: HttpResponse;

  // 新增：浏览器页面引用（用例级共享）
  public browserPage?: any;  // Playwright Page 对象

  // 新增：截图存储路径
  public screenshots: string[] = [];
}
```

### 2.5 StepExecutionResult 扩展

```typescript
// packages/core/src/plugins/executor.ts

export interface StepExecutionResult {
  // ... 已有字段 ...

  // 新增：浏览器操作结果
  browser?: {
    action: string;
    url?: string;                   // 当前页面 URL
    title?: string;                 // 当前页面标题
    screenshot?: string;            // 截图路径或 base64
    assertion?: {                   // 浏览器断言详情（与现有 assertion 区分）
      type: string;
      selector?: string;
      operator: string;
      expected?: any;
      actual?: any;
      passed: boolean;
    };
  };
}
```

---

## 3. 技术架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Web UI                                │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ 用例管理     │  │ 步骤编辑器        │  │ 运行结果       │  │
│  │ (browser    │  │ (browser step    │  │ (截图/断言/    │  │
│  │  type 支持) │  │  表单)           │  │  提取详情)     │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                      Server (Fastify)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Orchestrator                                         │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐            │   │
│  │  │ Http     │ │ Assertion │ │ Extract  │            │   │
│  │  │ Executor │ │ Executor  │ │ Executor │            │   │
│  │  └──────────┘ └───────────┘ └──────────┘            │   │
│  │  ┌──────────────────────────────────────────┐        │   │
│  │  │ Browser Executor (Playwright)             │        │   │
│  │  │ ┌─────────┐ ┌──────┐ ┌──────┐ ┌──────┐ │        │   │
│  │  │ │Navigate │ │Click │ │Fill  │ │Assert│ │        │   │
│  │  │ │...      │ │...   │ │...   │ │...   │ │        │   │
│  │  │ └─────────┘ └──────┘ └──────┘ └──────┘ │        │   │
│  │  └──────────────────────────────────────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Playwright  │
                    │  Browser     │
                    └─────────────┘
```

### 3.2 包职责变更

| 包 | 变更内容 |
|------|----------|
| `core` | StepType 枚举新增 `browser`；BrowserStepConfigSchema；RunContext 扩展 browserPage/screenshots；StepExecutionResult 扩展 browser 字段 |
| `plugin-api` | 新增 `browser-executor.ts`，实现 BrowserExecutor |
| `server` | 注册 BrowserExecutor 到 PluginRegistry；截图文件静态服务 |
| `web` | 步骤编辑器支持 browser 类型；运行结果展示截图和浏览器断言 |

### 3.3 新增文件清单

| 文件路径 | 说明 |
|----------|------|
| `packages/plugin-api/src/browser-executor.ts` | BrowserExecutor 实现 |
| `packages/web/src/components/features/browser-step-editor.tsx` | 浏览器步骤编辑器组件 |

### 3.4 修改文件清单

| 文件路径 | 变更内容 |
|----------|----------|
| `packages/core/src/models/test-step.ts` | StepType 新增 `browser`；新增 BrowserAction、BrowserAssertionSchema、BrowserStepConfigSchema |
| `packages/core/src/engine/run-context.ts` | 新增 browserPage、screenshots 属性 |
| `packages/core/src/plugins/executor.ts` | StepExecutionResult 新增 browser 字段 |
| `packages/plugin-api/src/index.ts` | 导出 BrowserExecutor，registerApiPlugins 中注册 |
| `packages/web/src/lib/api.ts` | TestStep type 新增 `browser` |
| `packages/web/src/i18n/locales/zh-CN.ts` | 新增 browser 相关翻译 |
| `packages/web/src/i18n/locales/en.ts` | 新增 browser 相关翻译 |

---

## 4. 详细设计

### 4.1 BrowserExecutor 实现

```typescript
// packages/plugin-api/src/browser-executor.ts

import { chromium, type Browser, type Page } from 'playwright';
import type { Executor, StepExecutionResult } from '@ai-tester/core';
import type { RunContext } from '@ai-tester/core';
import type { TestStep } from '@ai-tester/core';
import { BrowserStepConfigSchema } from '@ai-tester/core';

export class BrowserExecutor implements Executor {
  readonly type = 'browser';
  readonly configSchema = BrowserStepConfigSchema;

  private browser?: Browser;

  async setup(context: RunContext): Promise<void> {
    // 启动浏览器（用例级别，共享）
    this.browser = await chromium.launch({ headless: true });
    const page = await this.browser.newPage();
    context.browserPage = page;
  }

  async teardown(context: RunContext): Promise<void> {
    // 关闭浏览器
    await context.browserPage?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    context.browserPage = undefined;
    this.browser = undefined;
  }

  async execute(step: TestStep, context: RunContext): Promise<StepExecutionResult> {
    const config = BrowserStepConfigSchema.parse(step.config);
    const startTime = Date.now();

    // 确保 browser 已启动
    if (!context.browserPage) {
      await this.setup(context);
    }
    const page = context.browserPage as Page;

    try {
      const result = await this.executeAction(config, page, context);
      return {
        status: result.passed ? 'passed' : 'failed',
        durationMs: Date.now() - startTime,
        browser: result,
        assertion: result.assertion?.passed === false ? {
          expression: `${result.assertion.type}${result.assertion.selector ? ` on ${result.assertion.selector}` : ''}`,
          operator: result.assertion.operator,
          expected: result.assertion.expected,
          actual: result.assertion.actual,
          passed: result.assertion.passed,
        } : undefined,
        extractedVar: result.extractedVar,
      };
    } catch (err: any) {
      // 失败时自动截图
      let screenshot: string | undefined;
      try {
        const screenshotDir = path.join(os.tmpdir(), 'ai-tester-screenshots', context.runId);
        await fs.mkdir(screenshotDir, { recursive: true });
        const screenshotPath = path.join(screenshotDir, `${step.id}-error.png`);
        await page.screenshot({ path: screenshotPath });
        screenshot = screenshotPath;
        context.screenshots.push(screenshotPath);
      } catch {}

      return {
        status: 'error',
        error: { message: err.message, stack: err.stack },
        durationMs: Date.now() - startTime,
        browser: { action: config.action, screenshot },
      };
    }
  }

  private async executeAction(config: any, page: Page, context: RunContext): Promise<any> {
    const timeout = config.timeout ?? 30000;

    switch (config.action) {
      case 'navigate': {
        const url = context.resolveTemplate(config.url!);
        await page.goto(url, { waitUntil: config.waitUntil, timeout });
        return { action: 'navigate', passed: true, url: page.url(), title: await page.title() };
      }

      case 'click': {
        await page.locator(config.selector).click({
          button: config.button,
          clickCount: config.clickCount,
          force: config.force,
          timeout,
        });
        return { action: 'click', passed: true, url: page.url() };
      }

      case 'fill': {
        const value = context.resolveTemplate(config.value!);
        const locator = page.locator(config.selector);
        if (config.clear !== false) await locator.clear({ timeout });
        await locator.fill(value, { force: config.force, timeout });
        return { action: 'fill', passed: true };
      }

      case 'select': {
        const value = context.resolveTemplate(config.value!);
        await page.locator(config.selector).selectOption(value, { timeout });
        return { action: 'select', passed: true };
      }

      case 'check': {
        await page.locator(config.selector).check({ force: config.force, timeout });
        return { action: 'check', passed: true };
      }

      case 'uncheck': {
        await page.locator(config.selector).uncheck({ force: config.force, timeout });
        return { action: 'uncheck', passed: true };
      }

      case 'hover': {
        await page.locator(config.selector).hover({ force: config.force, timeout });
        return { action: 'hover', passed: true };
      }

      case 'wait': {
        if (config.duration) {
          await page.waitForTimeout(config.duration);
        } else if (config.selector) {
          await page.locator(config.selector).waitFor({
            state: config.state ?? 'visible',
            timeout,
          });
        }
        return { action: 'wait', passed: true };
      }

      case 'screenshot': {
        const screenshotDir = path.join(os.tmpdir(), 'ai-tester-screenshots', context.runId);
        await fs.mkdir(screenshotDir, { recursive: true });
        const screenshotPath = path.join(screenshotDir, `${Date.now()}.png`);
        const options: any = { path: screenshotPath, fullPage: config.fullPage ?? false };
        if (config.selector) {
          await page.locator(config.selector).screenshot(options);
        } else {
          await page.screenshot(options);
        }
        context.screenshots.push(screenshotPath);
        return { action: 'screenshot', passed: true, screenshot: screenshotPath };
      }

      case 'assert': {
        return this.executeAssertion(config.assertion, page, timeout);
      }

      case 'extract': {
        const locator = page.locator(config.selector);
        let value: any;
        if (config.attribute) {
          value = await locator.getAttribute(config.attribute, { timeout });
        } else {
          value = await locator.textContent({ timeout });
        }
        context.variables.set(config.variableName, value);
        return {
          action: 'extract',
          passed: true,
          extractedVar: { variableName: config.variableName, value },
        };
      }

      case 'keyboard': {
        await page.keyboard.press(config.key);
        return { action: 'keyboard', passed: true };
      }

      case 'goBack': {
        await page.goBack({ timeout });
        return { action: 'goBack', passed: true, url: page.url() };
      }

      case 'goForward': {
        await page.goForward({ timeout });
        return { action: 'goForward', passed: true, url: page.url() };
      }

      case 'close': {
        await page.close();
        context.browserPage = undefined;
        return { action: 'close', passed: true };
      }

      default:
        throw new Error(`Unsupported browser action: ${config.action}`);
    }
  }

  private async executeAssertion(assertion: any, page: Page, timeout: number): Promise<any> {
    const operator = assertion.operator ?? 'equals';
    let actual: any;
    let expected = assertion.expected;

    switch (assertion.type) {
      case 'text': {
        actual = (await page.locator(assertion.selector).textContent({ timeout }))?.trim();
        break;
      }
      case 'value': {
        actual = await page.locator(assertion.selector).inputValue({ timeout });
        break;
      }
      case 'visible': {
        actual = await page.locator(assertion.selector).isVisible();
        expected = true;
        break;
      }
      case 'hidden': {
        actual = await page.locator(assertion.selector).isHidden();
        expected = true;
        break;
      }
      case 'url': {
        actual = page.url();
        break;
      }
      case 'title': {
        actual = await page.title();
        break;
      }
      case 'attribute': {
        actual = await page.locator(assertion.selector).getAttribute(assertion.attribute, { timeout });
        break;
      }
      case 'count': {
        actual = await page.locator(assertion.selector).count();
        break;
      }
      default:
        throw new Error(`Unsupported assertion type: ${assertion.type}`);
    }

    const passed = this.evaluateAssertion(operator, actual, expected);

    return {
      action: 'assert',
      passed,
      assertion: { type: assertion.type, selector: assertion.selector, operator, expected, actual, passed },
    };
  }

  private evaluateAssertion(operator: string, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'contains': return String(actual).includes(String(expected));
      case 'matches': return new RegExp(String(expected)).test(String(actual));
      default: return false;
    }
  }
}
```

### 4.2 Orchestrator 生命周期管理

Orchestrator 需要在用例级别管理浏览器生命周期：

```typescript
// packages/core/src/engine/orchestrator.ts — executeCaseSteps 方法增强

private async executeCaseSteps(testCaseId: string, context: RunContext, callDepth: number): Promise<TestStepResult[]> {
  // ... 现有逻辑 ...

  // 检测用例是否包含 browser 步骤
  const hasBrowserSteps = sortedSteps.some(s => s.type === 'browser');

  // 如果有 browser 步骤，找到 BrowserExecutor 并调用 setup
  if (hasBrowserSteps) {
    const browserExecutor = this.deps.registry.get('browser');
    if (browserExecutor?.setup) {
      await browserExecutor.setup(context);
    }
  }

  try {
    // ... 执行步骤（现有逻辑不变，browser 步骤通过 registry.getOrThrow 正常路由） ...
  } finally {
    // 用例结束时 teardown 浏览器
    if (hasBrowserSteps) {
      const browserExecutor = this.deps.registry.get('browser');
      if (browserExecutor?.teardown) {
        await browserExecutor.teardown(context);
      }
    }
  }
}
```

### 4.3 截图存储与展示

**存储**：
- 截图保存到 `{os.tmpdir()}/ai-tester-screenshots/{runId}/` 目录
- 失败步骤自动截图，`screenshot` action 主动截图

**服务**：
- Server 暴露静态文件路由：`GET /api/v1/screenshots/:runId/:filename`
- 前端通过此 URL 在运行结果中展示截图

**StepExecutionResult** 中 `browser.screenshot` 存储相对路径，前端拼接完整 URL。

### 4.4 前端步骤编辑器设计

browser 步骤编辑器根据 `action` 动态渲染表单字段：

```
┌─────────────────────────────────────────────┐
│ 步骤类型: [Browser ▼]                       │
│ 步骤名称: [打开登录页            ]           │
├─────────────────────────────────────────────┤
│ 操作: [navigate ▼]                          │
│                                              │
│ URL: [https://example.com/login ]           │
│ 等待策略: [load ▼]                          │
│ 超时(ms): [30000]                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 步骤类型: [Browser ▼]                       │
│ 步骤名称: [输入用户名            ]           │
├─────────────────────────────────────────────┤
│ 操作: [fill ▼]                              │
│                                              │
│ 选择器: [#username              ]           │
│ 值: [{{testUser}}              ]           │
│ 先清空: [✓]                                  │
│ 超时(ms): [30000]                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 步骤类型: [Browser ▼]                       │
│ 步骤名称: [验证登录成功          ]           │
├─────────────────────────────────────────────┤
│ 操作: [assert ▼]                            │
│                                              │
│ 断言类型: [text ▼]                          │
│ 选择器: [.welcome-msg           ]           │
│ 操作符: [contains ▼]                        │
│ 期望值: [Welcome]                           │
│ 超时(ms): [30000]                           │
└─────────────────────────────────────────────┘
```

各 action 的表单字段：

| 字段 | 显示条件 | 控件类型 |
|------|----------|----------|
| `url` | navigate | Input |
| `waitUntil` | navigate | Select (load/domcontentloaded/networkidle) |
| `selector` | click/fill/select/check/uncheck/hover/wait/extract/assert(text/value/visible/hidden/attribute/count) | Input |
| `value` | fill/select | Input (支持模板变量) |
| `clear` | fill | Checkbox |
| `button` | click | Select (left/right/middle) |
| `clickCount` | click | NumberInput |
| `force` | click/fill/check/uncheck/hover | Checkbox |
| `state` | wait (有 selector 时) | Select (visible/hidden/attached/detached) |
| `duration` | wait | NumberInput |
| `fullPage` | screenshot | Checkbox |
| `variableName` | extract | Input |
| `attribute` | extract/assert(attribute) | Input |
| `key` | keyboard | Input |
| 断言类型 | assert | Select |
| 断言操作符 | assert | Select |
| 期望值 | assert (非 visible/hidden) | Input |

### 4.5 运行结果展示

运行结果页面需要增强以下展示：

1. **截图缩略图**：browser 步骤结果中展示截图，点击可放大
2. **浏览器断言详情**：展示 type/selector/operator/expected/actual
3. **浏览器操作信息**：展示 action、当前 URL、页面标题

---

## 5. 依赖管理

### 5.1 新增依赖

| 包 | 依赖 | 版本 | 说明 |
|------|------|------|------|
| `plugin-api` | `playwright` | ^1.52 | 浏览器自动化 |

### 5.2 安装方式

```bash
pnpm add -F @ai-tester/plugin-api playwright
pnpm exec playwright install chromium
```

### 5.3 CI 环境补充

CI/CD 流水线需安装 Playwright 系统依赖：

```bash
pnpm exec playwright install-deps chromium
```

---

## 6. 实施计划

### Phase 1：后端浏览器执行器

| 步骤 | 内容 | 涉及包 |
|------|------|--------|
| 1.1 | StepType 枚举新增 `browser`，定义 BrowserStepConfigSchema | core |
| 1.2 | RunContext 新增 browserPage/screenshots 属性 | core |
| 1.3 | StepExecutionResult 新增 browser 字段 | core |
| 1.4 | 实现 BrowserExecutor | plugin-api |
| 1.5 | 注册 BrowserExecutor 到 PluginRegistry | plugin-api |
| 1.6 | Orchestrator 用例级浏览器生命周期管理 | core |
| 1.7 | Server 截图静态文件服务 | server |
| 1.8 | 安装 Playwright 依赖 | 根目录 |

### Phase 2：前端步骤编辑器与结果展示

| 步骤 | 内容 | 涉及包 |
|------|------|--------|
| 2.1 | browser 步骤编辑器组件 | web |
| 2.2 | 集成到步骤编辑器（按 type 切换） | web |
| 2.3 | i18n 翻译（中英双语） | web |
| 2.4 | 运行结果截图展示 | web |
| 2.5 | 运行结果浏览器断言详情展示 | web |
| 2.6 | Dogfooding 验证 | 全系统 |

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Playwright 安装体积大 | CI/CD 构建变慢，Docker 镜像变大 | 仅安装 chromium，不安装 firefox/webkit |
| 浏览器执行慢 | 用例运行时间显著增加 | 默认 headless 模式，合理设置 timeout |
| 截图占用磁盘 | 长期运行磁盘满 | 截图存临时目录，定期清理或设置上限 |
| 并发浏览器实例 | 内存压力 | 限制并发浏览器数量，复用 browser 实例 |
| Selector 脆弱性 | 目标系统变更导致用例失败 | 支持多种 selector 策略，推荐 data-testid |

---

## 8. 后续扩展

- **多浏览器支持**：支持 Firefox、WebKit（通过配置切换）
- **录制回放**：集成 Playwright Codegen，支持录制操作生成用例
- **视觉回归测试**：基于截图的像素级对比
- **网络拦截**：Mock API 响应，加速测试
- **AI 辅助生成**：基于页面结构 AI 生成 browser 步骤
