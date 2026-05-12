# AI-Tester 与 Playwright 的关系定位

> 记录时间：2026-04-24
> 讨论背景：在已有 Playwright 作为 E2E 测试执行引擎的前提下，是否有必要持续投入建设 AI-Tester 测试平台？

---

## 一、问题的本质

Playwright（以及 Cypress、Selenium 等传统 E2E 框架）的核心模式是：

> **"用代码写测试"** → 代码文件 → 本地/CI 执行 → 报告文件

AI-Tester 的核心模式是：

> **"用数据定义测试"** → 数据库存储 → 可视化编排 → 平台化执行 → 结构化结果

两者不是同一层次的东西。Playwright 是**执行引擎**，AI-Tester 是**管理平台**。

---

## 二、Playwright 脚本的结构性局限

| 问题 | 具体表现 |
|------|---------|
| **管理碎片化** | 测试用例是 `.spec.ts` 文件，散落在文件系统中，靠目录命名约定组织，无法全文检索、标签分类、优先级筛选 |
| **协作冲突** | 多人同时修改同一个 `.spec.ts` 文件时，Git 冲突频繁，且测试步骤的 diff 极难阅读 |
| **执行黑盒** | 执行结果要么是 `passed`/`failed` 的终端输出，要么是静态 HTML 报告，没有历史趋势、没有运行对比、没有步骤级回溯 |
| **门槛过高** | 编写者必须懂 TypeScript/JavaScript + Playwright API，产品经理、测试工程师很难直接参与 |
| **环境硬编码** | baseURL、认证信息、测试数据通常硬编码在代码或 `.env` 中，切换环境需要改代码或重启进程 |
| **数据驱动弱** | 参数化测试靠代码循环实现，测试数据（CSV/JSON）与用例逻辑分离，维护困难 |

---

## 三、AI-Tester 的不可替代价值

### 1. 数据库驱动的用例生命周期管理

Playwright 的用例是**文件**，AI-Tester 的用例是**结构化数据**：

- 支持按 `module` 路径树形组织（如 `user/auth/login`）
- 支持 `tags` 横向标签分类（如 `冒烟`、`回归`、`P0`）
- 支持 `priority` 优先级标记
- 支持全文搜索 + 多条件过滤
- 每次修改自动记录 `version` 版本号

这意味着可以像管理 Jira 需求一样管理测试用例，而不是在 `find/grep` 中翻找 `.spec.ts` 文件。

### 2. 可视化步骤编排（低门槛）

Playwright 要求编写代码：

```typescript
test('用户登录流程', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('#submit');
  await expect(page.locator('.welcome')).toBeVisible();
});
```

AI-Tester 让非技术人员可以通过下拉框和表单完成同样的流程，而且步骤顺序可以拖拽调整、可以插入/删除、可以设置重试和失败继续策略。

### 3. 执行过程的数据化管理

Playwright 执行一次测试后，除了报告文件，没有任何数据留存。AI-Tester 每次执行都产生结构化的 `TestRun` → `TestCaseResult` → `TestStepResult` 记录：

- **历史对比**：可以对比同一用例在不同时间的执行结果
- **趋势分析**：Dashboard 可以展示通过率变化趋势
- **步骤级回溯**：哪一步失败、耗时多少、当时的页面 URL 和截图是什么
- **截图与视觉回归**：像素级比对 + Diff 图 + 三图对比视图

### 4. 多环境配置与运行时切换

Playwright 的环境切换通常需要修改代码或环境变量。AI-Tester 的项目级 `environments` 配置允许：

- 一个用例在 `dev` / `staging` / `prod` 环境之间无缝切换
- 环境变量通过 `{{baseUrl}}`、`{{token}}` 模板语法注入
- 运行时选择环境，不需要改任何代码

### 5. 数据集驱动的参数化测试

AI-Tester 内置 `TestDataSet` 实体，支持：

- 可视化编辑测试数据（字段定义 + 多行数据）
- `load-dataset` 步骤将数据加载到执行上下文
- 用例内部通过 `{{variableName}}[0].field` 访问数据

Playwright 中同样的功能需要手写 `for` 循环或 `@playwright/test` 的 `test.extend`。

### 6. 用例复用（子用例调用）

AI-Tester 的 `call` 步骤允许一个用例调用另一个用例，共享执行上下文。这在 Playwright 中只能通过 `import` 函数复用，且上下文隔离。

### 7. AI 集成能力

这是 Playwright 完全不具备的维度：

- **AI 生成用例**：基于 OpenAPI/cURL/自由文本自动生成测试步骤
- **OCR 文字提取**：从截图中提取文字内容用于断言
- **AI 解析 API 文档**：自动构建知识库

---

## 四、两者的正确关系

```
┌─────────────────────────────────────────────────────────┐
│                    AI-Tester 平台层                      │
│  (用例管理 / 可视化编排 / 执行调度 / 结果分析 / AI 生成)   │
├─────────────────────────────────────────────────────────┤
│              Playwright / undici / Tesseract            │
│         (浏览器自动化 / HTTP 请求 / OCR 识别)             │
├─────────────────────────────────────────────────────────┤
│                   Chromium / Node.js                     │
└─────────────────────────────────────────────────────────┘
```

类比：
- Playwright 像是 `gcc`（编译器）
- AI-Tester 像是 `VS Code + Git + CI/CD + 项目管理`（完整工具链）

你不会因为有 gcc 就放弃 IDE 和版本控制。

---

## 五、当前阶段的客观评估

也必须诚实地说，**当前 AI-Tester 的浏览器能力只是 Playwright 的一个子集**：

| Playwright 能力 | AI-Tester 当前覆盖 | 差距 |
|----------------|-------------------|------|
| 页面导航/点击/输入 | 完整覆盖 | 无 |
| 截图/视觉回归 | 完整覆盖 | 无 |
| Cookie/Storage 管理 | 已实现 | 无 |
| 弹窗处理 | 已实现 | 无 |
| 文件上传 | 已实现 | 无 |
| iframe / Shadow DOM | 未实现 | 高 |
| 网络拦截/ Mock | 未实现 | 高 |
| 多浏览器（Firefox/Safari） | 仅 Chromium | 中 |
| 移动端模拟 | 未实现 | 中 |
| Trace/视频录制 | 未实现 | 低 |

**关键洞察**：对于 AI-Tester 已经覆盖的场景（API 测试、常规页面交互、截图验证、Cookie/Storage 操作、弹窗处理、文件上传），使用 AI-Tester 的系统化管理收益远大于手写 Playwright 脚本。对于尚未覆盖的高级场景（iframe、网络 Mock、多浏览器），仍然需要回退到原生 Playwright 脚本。

---

## 六、结论

**AI-Tester 的价值不是"比 Playwright 写测试更快"，而是"让测试资产变得可管理、可追溯、可协作、可 AI 增强"。**

如果你团队的测试用例只有 10 个、且都是资深开发维护，Playwright 脚本完全够用。但如果你需要：

- 管理 100+ 测试用例
- 让非技术人员参与编写
- 追踪历史执行趋势
- 在多环境间切换
- 用 AI 辅助生成和维护
- 做数据驱动的参数化测试

那么 **AI-Tester 提供的系统化管理层是 Playwright 原生脚本无法替代的**。

从工程演进角度，AI-Tester 的理想终态是：**覆盖 80% 的标准测试场景**，对于剩下的 20% 复杂场景，提供"导出为 Playwright 脚本"或"自定义 JS 步骤"的逃生舱。
