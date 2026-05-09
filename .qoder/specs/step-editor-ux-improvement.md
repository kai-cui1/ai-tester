# 步骤编辑器 UX 易用性改进计划

## Context

用户反馈：测试用例编辑器中各步骤类型的输入字段缺少引导和提示，使用不方便。当前问题：
1. **所有字段无标签** — 仅有 placeholder，用户输入后失去上下文
2. **下拉选项显示裸技术名** — assertion 的 source 显示 `status`/`jsonpath`，operator 显示 `equals`/`gt`/`not_contains` 等
3. **无帮助文本** — 用户不知道 JSONPath 语法、正则格式、模板变量用法
4. **call/load-dataset 步骤需手动输入 ID** — 应改为可搜索下拉选择
5. **continueOnFailure 和 retryCount** — 已定义在数据模型中但 UI 未暴露
6. **操作按钮无提示** — 上移/下移/删除按钮没有 tooltip

## 修改文件清单

| 文件 | 操作 |
|------|------|
| `packages/web/src/components/ui/tooltip.tsx` | **新建** — 封装已安装的 `@radix-ui/react-tooltip` |
| `packages/web/src/components/ui/searchable-select.tsx` | **新建** — 可搜索下拉选择组件（纯 Tailwind + 原生实现） |
| `packages/web/src/pages/test-cases.tsx` | **修改** — StepEditor 核心改造 |
| `packages/web/src/i18n/locales/en.ts` | **修改** — 新增 ~55 个英文翻译键 |
| `packages/web/src/i18n/locales/zh-CN.ts` | **修改** — 新增对应中文翻译键 |

## 实施步骤

### Step 1: 创建 Tooltip 组件

`packages/web/src/components/ui/tooltip.tsx`

- `@radix-ui/react-tooltip` 已在 package.json 安装（^1.2.8），只是缺少 shadcn/ui 封装组件
- 导出: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`
- 遵循现有 shadcn/ui 组件的 `cn()` + `forwardRef` 模式

### Step 2: 创建 SearchableSelect 组件

`packages/web/src/components/ui/searchable-select.tsx`

不引入新依赖，用原生 HTML + Tailwind 实现：
- 触发按钮样式与 SelectTrigger 一致
- 点击展开绝对定位下拉面板（z-50）
- 面板顶部：搜索输入框（自动聚焦）
- 面板主体：过滤后的选项列表（max-h-48 overflow-y-auto）
- 每个选项显示 label + 可选的 description（muted 样式）
- 点击外部 / Escape 关闭
- Props: `value`, `onValueChange`, `options: {value, label, description?}[]`, `placeholder`, `searchPlaceholder`, `emptyText`

### Step 3: 添加 i18n 翻译键（en.ts + zh-CN.ts）

**新增键分类：**

`testCases.steps` 新增：
| 键 | EN | ZH-CN |
|---|---|---|
| `moveUp` | Move up | 上移 |
| `moveDown` | Move down | 下移 |
| `remove` | Remove step | 删除步骤 |
| `continueOnFailure` | Continue on failure | 失败后继续 |
| `retryCount` | Retries | 重试次数 |

`testCases.httpConfig` 新增：
| 键 | EN | ZH-CN |
|---|---|---|
| `urlLabel` | Request URL | 请求地址 |
| `urlHint` | Supports template variables, e.g. \{\{baseUrl\}\} | 支持模板变量，如 \{\{baseUrl\}\} |
| `bodyLabel` | Request Body | 请求体 |
| `bodyHint` | JSON format. Supports \{\{variableName\}\} template syntax. | JSON 格式，支持 \{\{variableName\}\} 模板语法 |

`testCases.assertionConfig` 新增：
| 键 | EN | ZH-CN |
|---|---|---|
| `sourceLabel` | Assert Source | 断言来源 |
| `source.status` | Status Code | 状态码 |
| `source.header` | Response Header | 响应头 |
| `source.body` | Response Body | 响应体 |
| `source.jsonpath` | JSONPath | JSONPath |
| `source.variable` | Variable | 上下文变量 |
| `operatorLabel` | Operator | 操作符 |
| `operator.equals` | Equals (==) | 等于 (==) |
| `operator.not_equals` | Not equals (!=) | 不等于 (!=) |
| `operator.contains` | Contains | 包含 |
| `operator.not_contains` | Not contains | 不包含 |
| `operator.gt` | Greater than (>) | 大于 (>) |
| `operator.gte` | Greater or equal (>=) | 大于等于 (>=) |
| `operator.lt` | Less than (<) | 小于 (<) |
| `operator.lte` | Less or equal (<=) | 小于等于 (<=) |
| `operator.matches` | Regex match | 正则匹配 |
| `operator.exists` | Exists | 存在 |
| `operator.not_exists` | Not exists | 不存在 |
| `operator.type_is` | Type is | 类型为 |
| `expectedLabel` | Expected Value | 期望值 |
| `expressionLabel` | Expression | 表达式 |
| `hintJsonpath` | JSONPath syntax, e.g. $.data.items[0].id | JSONPath 语法，如 $.data.items[0].id |
| `hintHeader` | Response header name, e.g. Content-Type | 响应头名称，如 Content-Type |
| `hintVariable` | Variable name from a previous extract step | 前置提取步骤中的变量名 |

`testCases.extractConfig` 新增：
| 键 | EN | ZH-CN |
|---|---|---|
| `sourceLabel` | Extract From | 提取来源 |
| `source.body` | Full Body | 完整响应体 |
| `source.jsonpath` | JSONPath | JSONPath |
| `source.header` | Response Header | 响应头 |
| `source.status` | Status Code | 状态码 |
| `source.regex` | Regex | 正则表达式 |
| `expressionLabel` | Expression | 提取表达式 |
| `variableLabel` | Variable Name | 变量名 |
| `variableHint` | Use as \{\{variableName\}\} in later steps | 在后续步骤中通过 \{\{variableName\}\} 引用 |
| `hintJsonpath` | JSONPath syntax, e.g. $.data.token | JSONPath 语法，如 $.data.token |
| `hintHeader` | Header name to extract | 要提取的响应头名称 |
| `hintRegex` | Regex with capture group, e.g. token=(\\w+) | 带捕获组的正则，如 token=(\\w+) |
| `placeholderRegex` | token=(\\w+) | token=(\\w+) |

`testCases.callConfig` 新增：
| 键 | EN | ZH-CN |
|---|---|---|
| `label` | Test Case to Call | 调用的测试用例 |
| `placeholder` | Select a test case... | 选择测试用例... |
| `searchPlaceholder` | Search test cases... | 搜索测试用例... |
| `empty` | No test cases found | 未找到测试用例 |
| `hint` | Shares execution context with the calling test case | 与调用方共享执行上下文 |

`testCases.datasetConfig` 新增：
| 键 | EN | ZH-CN |
|---|---|---|
| `datasetLabel` | Dataset | 数据集 |
| `datasetPlaceholder` | Select a dataset... | 选择数据集... |
| `datasetSearchPlaceholder` | Search datasets... | 搜索数据集... |
| `datasetEmpty` | No datasets found | 未找到数据集 |
| `variableLabel` | Variable Name | 变量名 |
| `variableHint` | Access rows as \{\{variableName\}\}, fields as \{\{variableName[0].field\}\} | 通过 \{\{variableName\}\} 访问行，\{\{variableName[0].field\}\} 访问字段 |

### Step 4: 改造 StepEditor — 操作按钮 Tooltip

将移动/删除按钮用 `Tooltip` 包裹，显示 `t("testCases.steps.moveUp")` 等提示文本。最外层包裹 `TooltipProvider`。

### Step 5: 添加通用选项行（continueOnFailure + retryCount）

在 header 行和类型配置区之间添加一行：
```
[失败后继续: [toggle]] [重试次数: [0 ▾]]
```
- `continueOnFailure`: 用一个简单的 `<button role="switch">` 实现切换（纯 Tailwind 样式，不引入新依赖）
- `retryCount`: 用 Select 组件，选项 [0, 1, 2, 3]
- 布局: `flex items-center gap-4`，紧凑一行

### Step 6: 改造 HTTP 步骤 UI

在现有输入框上方添加 `text-xs` 标签，关键字段下方添加 `text-[11px] text-muted-foreground/70` 帮助文本：

```
请求方法       请求地址
[GET ▾]        [{{baseUrl}}/api/users                 ]
               ⓘ 支持模板变量，如 {{baseUrl}}
请求体
[                                                      ]
ⓘ JSON 格式，支持 {{variableName}} 模板语法
```

### Step 7: 改造断言步骤 UI

1. 每列上方加标签（断言来源 / 操作符 / 期望值）
2. source 下拉改为显示人类可读文本: `status` → "状态码"，`jsonpath` → "JSONPath" 等
3. operator 下拉改为显示人类可读文本: `equals` → "等于 (==)"，`gt` → "大于 (>)" 等
4. expression 行（条件出现）加标签 + 根据 source 类型显示不同帮助文本
5. source 为 `variable` 时也显示 expression 输入框

```
断言来源         操作符            期望值
[状态码 ▾]       [等于 (==) ▾]     [200          ]

表达式 (jsonpath/header/variable 时出现)
[$.data.user.name                                     ]
ⓘ JSONPath 语法，如 $.data.items[0].id
```

### Step 8: 改造变量提取步骤 UI

1. 三列各加标签
2. source 下拉显示人类可读文本
3. expression placeholder 根据 source 动态变化（jsonpath → `$.data.token`，header → `Content-Type`，regex → `token=(\w+)`）
4. source 为 `body` 或 `status` 时隐藏/禁用 expression 字段
5. variableName 下方加帮助文本: "在后续步骤中通过 \{\{variableName\}\} 引用"

```
提取来源         提取表达式                  变量名
[JSONPath ▾]     [$.data.token         ]    [authToken        ]
                                             ⓘ 在后续步骤中通过 {{authToken}} 引用
```

### Step 9: 改造子用例调用步骤 UI

1. 替换 Input 为 SearchableSelect 组件
2. 数据来源: 通过 `testCases.list(projectId)` 获取同项目下的用例列表
3. `StepEditorProps` 新增 `projectId: string`，从 `TestCaseDialog` 传入
4. 延迟加载：仅当 step.type === "call" 时 fetch 数据
5. 下拉每项显示: 用例名称 + 模块路径（muted）

```
调用的测试用例
[🔍 选择测试用例...                               ▾]
ⓘ 与调用方共享执行上下文
```

### Step 10: 改造加载数据集步骤 UI

1. datasetId 替换为 SearchableSelect，数据来源 `datasets.list(projectId)`
2. 需在 `api.ts` 的 `datasets.list` 已有接口基础上直接使用
3. variableName 加标签和帮助文本

```
数据集                                变量名
[🔍 选择数据集...              ▾]    [userData           ]
                                      ⓘ 通过 {{userData}} 访问行数据
```

### Step 11: TypeCheck + Build 验证

```bash
pnpm --filter @ai-tester/web typecheck
pnpm --filter @ai-tester/web build
```

## 布局紧凑性策略

- 标签使用 `text-xs`（12px）而非默认 Label 尺寸
- 帮助文本使用 `text-[11px] text-muted-foreground/70`，视觉上不抢眼
- 通用选项行（continueOnFailure + retryCount）为单行 flex 布局
- SearchableSelect 高度与现有 Input 一致（h-8）
- 每个步骤净增约 30-60px 高度，Dialog 本身已有 `max-h-[90vh] overflow-y-auto`

## 验证方式

1. `pnpm --filter @ai-tester/web typecheck` 无错误
2. `pnpm --filter @ai-tester/web build` 构建成功
3. 启动 dev server，打开测试用例编辑器：
   - 验证所有 5 种步骤类型的标签、帮助文本、下拉选项都正确显示中文
   - 切换到英文，验证所有文本正确
   - call 步骤能搜索并选择同项目的测试用例
   - load-dataset 步骤能搜索并选择数据集
   - continueOnFailure 开关和 retryCount 选择器正常工作
   - 操作按钮 tooltip 正常显示
