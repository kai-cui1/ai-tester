# i18n 多语言支持实现计划

## Context

AI-Tester Web UI 当前所有文本都是硬编码的英文。需要支持中文（默认）和英文两种语言，并提供运行时切换功能。前端共约 235 个用户可见字符串，分布在 7 个页面组件和 2 个布局组件中。

## 技术方案

- **库选型**: `react-i18next` + `i18next` (~13KB gzip，内置插值/复数，TypeScript 类型安全)
- **翻译文件**: `.ts` 格式（不是 JSON），单 namespace，dot-notation 键名
- **状态管理**: i18next 内置机制 + `useTranslation()` hook（不需要新 Context）
- **持久化**: `localStorage` key `ai-tester:lang`
- **语言切换器**: 放在侧边栏底部，复用现有 DropdownMenu 组件

## 不翻译的技术术语

HTTP methods (GET/POST/PUT...), assertion operators (equals/contains...), assertion/extract sources (status/jsonpath...), 技术占位符 ({{baseUrl}}/api/..., $.data.id)

## 文件结构

```
src/i18n/
├── index.ts           # i18next 初始化 + changeLanguage + 类型声明
└── locales/
    ├── zh-CN.ts       # 中文翻译 (默认语言)
    └── en.ts          # 英文翻译 (类型源)
src/components/layout/
└── language-switcher.tsx  # 语言切换下拉组件
```

## 实现步骤

### Step 1: 安装依赖
```
pnpm --filter @ai-tester/web add i18next react-i18next
```

### Step 2: 创建翻译文件 `src/i18n/locales/en.ts` 和 `src/i18n/locales/zh-CN.ts`

键名约定: `{area}.{section}.{element}`，例如：
- `common.loading` → "Loading..." / "加载中..."
- `sidebar.nav.dashboard` → "Dashboard" / "仪表盘"
- `projects.confirmDelete` → "Delete this project?..." / "确定删除此项目？..."
- `dashboard.cases` → "{{count}} cases" / "{{count}} 个用例"

共 ~235 个键，包含:
- `common.*` (~25): Loading, Cancel, Save, Delete, Edit 等共用文本
- `sidebar.*` (~10): 导航标签、当前项目
- `dashboard.*` (~15): 统计卡片标题、最近运行
- `projects.*` (~20): CRUD 对话框、表单标签
- `testCases.*` (~60): 步骤编辑器、类型标签、占位符
- `suites.*` (~35): 两个对话框、表头
- `runs.*` (~20): 状态标签、表头
- `runDetail.*` (~30): 选项卡、摘要卡片、断言详情
- `datasets.*` (~20): CRUD 对话框、JSON 编辑器

### Step 3: 创建 `src/i18n/index.ts`

- 导入 i18next + initReactI18next
- 从 localStorage 读取初始语言，默认 `zh-CN`
- 配置 resources, fallbackLng: `en`, interpolation.escapeValue: false
- 导出 `changeLanguage(lang)` 函数（切换语言 + 写 localStorage + 设置 html lang）
- TypeScript 模块增强确保 `t()` 键名自动补全

### Step 4: 在 `src/main.tsx` 添加 `import '@/i18n'`

### Step 5: 创建 `src/components/layout/language-switcher.tsx`

- Globe 图标 + DropdownMenu
- 展开态显示当前语言名称
- 折叠态只显示图标
- 接受 `collapsed` prop

### Step 6: 迁移布局组件

**修改 `src/components/layout/sidebar.tsx`**:
- navItems 的 label 改为翻译 key，渲染时用 `t(item.labelKey)`
- "AI-Tester" 品牌名保留不翻译
- "Current project" 改为 `t('sidebar.currentProject')`
- 在底部 collapse 按钮上方插入 LanguageSwitcher

### Step 7: 逐页迁移（按复杂度从低到高）

1. `dashboard.tsx` - 简单字符串 + 少量插值
2. `projects.tsx` - CRUD 对话框 + confirm
3. `runs.tsx` - statusConfig.label 改为 labelKey + t()
4. `run-detail.tsx` - 摘要卡片 + tabs + 断言标签
5. `datasets.tsx` - CRUD 对话框
6. `suites.tsx` - 两个对话框 + 已选计数插值
7. `test-cases.tsx` - 最复杂：stepTypeLabels 改为返回翻译值的函数

### Step 8: 日期格式化

所有 `toLocaleString()` / `toLocaleDateString()` 调用加上 `i18n.language` 参数：
```tsx
const { i18n } = useTranslation();
new Date(run.createdAt).toLocaleString(i18n.language)
```

### Step 9: 验证

- `pnpm --filter @ai-tester/web typecheck`
- `pnpm --filter @ai-tester/web build`
- 启动 dev server，切换中英文验证所有页面
- 刷新后语言偏好应保持

## 关键修改文件

| 文件 | 操作 |
|------|------|
| `src/i18n/index.ts` | 新建 |
| `src/i18n/locales/en.ts` | 新建 |
| `src/i18n/locales/zh-CN.ts` | 新建 |
| `src/components/layout/language-switcher.tsx` | 新建 |
| `src/main.tsx` | 添加一行 import |
| `src/components/layout/sidebar.tsx` | 翻译 + 语言切换器 |
| `src/pages/dashboard.tsx` | ~15 处替换 |
| `src/pages/projects.tsx` | ~20 处替换 |
| `src/pages/test-cases.tsx` | ~60 处替换 |
| `src/pages/suites.tsx` | ~35 处替换 |
| `src/pages/runs.tsx` | ~20 处替换 |
| `src/pages/run-detail.tsx` | ~30 处替换 |
| `src/pages/datasets.tsx` | ~20 处替换 |

## 常用模式

```tsx
// A: 简单字符串
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>

// B: 插值
<p>{t('dashboard.cases', { count: run.totalCases })}</p>

// C: 条件字符串
<DialogTitle>{t(editing ? 'projects.editTitle' : 'projects.createTitle')}</DialogTitle>

// D: 对象 map 的 label 改为 key
const statusConfig = { passed: { labelKey: 'status.passed', ... } };
// 渲染时: t(cfg.labelKey)

// E: 模块顶层数组
const navItems = [{ to: '/', labelKey: 'sidebar.nav.dashboard' }];
// 渲染时: <span>{t(item.labelKey)}</span>

// F: 日期本地化
new Date(dateStr).toLocaleString(i18n.language)
```
