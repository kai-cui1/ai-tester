# 截图断言能力增强计划

## Context

当前浏览器测试的 `screenshot` action 仅生成 PNG 文件并返回路径，没有任何对截图内容或元数据的验证能力。用户在测试用例中使用截图步骤后，无法断言截图是否正常生成、尺寸是否正确、内容是否符合预期。本计划按复杂度从低到高分三个阶段逐步增强截图断言能力。

---

## Phase A：截图元数据断言（低复杂度）

### 目标
让 `screenshot` action 返回截图的元数据（尺寸、文件大小），并在 `assert` action 中新增 `screenshot` 断言类型，支持对元数据进行验证。

### 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/plugin-api/src/browser-executor.ts` | **修改** | `screenshot` action 返回 width/height/size；`executeAssertion` 新增 `screenshot` 分支 |
| `packages/web/src/components/features/browser-step-editor.tsx` | **修改** | ASSERTION_TYPES 新增 `screenshot`，新增 screenshot 断言配置 UI |
| `packages/web/src/i18n/locales/zh-CN.ts` | **修改** | 新增翻译键 |
| `packages/web/src/i18n/locales/en.ts` | **修改** | 新增对应英文翻译键 |

### 后端实现细节

**1. screenshot action 返回元数据**

```typescript
case 'screenshot': {
  // ... 现有截图逻辑 ...
  const stat = await fs.stat(screenshotPath);
  // 使用 sharp 或原生方式读取尺寸
  // 返回:
  return {
    action: 'screenshot',
    passed: true,
    screenshot: screenshotPath,
    metadata: {
      width: number,
      height: number,
      size: stat.size,      // 字节数
      format: 'png',
    },
  };
}
```

> 是否引入 `sharp`：需要评估。如果项目已依赖或可以轻量引入，优先用 sharp 读取尺寸；否则可用纯 Node.js 方案（如读取 PNG 文件头解析 IHDR chunk）。

**2. assert action 新增 screenshot 类型**

```typescript
case 'screenshot': {
  // assertion.property: 'fileExists' | 'width' | 'height' | 'size'
  // assertion.operator: 'equals' | 'gt' | 'gte' | 'lt' | 'lte'
  // assertion.expected: number | boolean
  const lastScreenshot = /* 从 context 或上一步结果中获取最新截图路径 */;
  // 如果上一步不是 screenshot，尝试从 context.screenshots 取最后一个
  if (!lastScreenshot) {
    throw new Error('没有可用的截图用于断言');
  }
  const stat = await fs.stat(lastScreenshot);
  switch (assertion.property) {
    case 'fileExists': actual = true; break;
    case 'width':  // 需要尺寸信息，从 context 缓存或重新读取
    case 'height':
    case 'size': actual = stat.size; break;
  }
  break;
}
```

**关键设计决策**：
- `screenshot` 断言类型引用的是"上一步或当前上下文中的最新截图"。
- 需要在 `RunContext` 中维护 `lastScreenshot: { path, width, height, size }`。
- 断言比较运算符需要扩展 `gt`/`gte`/`lt`/`lte`（当前只有 `equals`/`contains`/`matches`）。

### 前端实现细节

**Browser Step Editor 中 assertion 配置 UI 扩展**：

当 `action === "assert"` 且 `assertion.type === "screenshot"` 时，显示：
- `property` 下拉：fileExists / width / height / size
- `operator` 下拉：equals / gt / gte / lt / lte
- `expected` 输入框：数字类型

### 验收标准
- [ ] `screenshot` action 执行后返回 metadata（width/height/size）
- [ ] 可以在 assert action 中选择 `screenshot` 类型
- [ ] 支持断言：文件存在、宽度等于/大于/小于期望值、高度、文件大小
- [ ] Dogfooding 用例覆盖 screenshot 元数据断言

---

## Phase B：截图内容提取（OCR）（中复杂度）

### 目标
支持从截图中提取文字内容（OCR），提取结果存入变量，供后续断言步骤使用。

### 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/plugin-api/package.json` | **修改** | 新增 OCR 依赖（如 `tesseract.js` 或 `@napi-rs/canvas` + `tesseract.js`） |
| `packages/plugin-api/src/browser-executor.ts` | **修改** | `extract` action 新增 `screenshot` source；截图后执行 OCR |
| `packages/plugin-api/src/ocr-service.ts` | **新建** | OCR 能力封装，支持中文+英文识别 |
| `packages/web/src/components/features/browser-step-editor.tsx` | **修改** | extract action 的 source 下拉新增 `screenshot` 选项 |
| `packages/web/src/i18n/locales/zh-CN.ts` | **修改** | 新增翻译键 |
| `packages/web/src/i18n/locales/en.ts` | **修改** | 新增对应英文翻译键 |

### 后端实现细节

**1. OCR 依赖选择**

候选方案：
- `tesseract.js`：纯 JS，无需原生依赖，支持 100+ 语言，但性能较慢（首次加载 ~10MB 训练数据）
- `@paddlejs-models/ocr`：基于 PaddleOCR，中文识别效果好，但需要评估兼容性
- 调用外部 CLI（如系统已安装 tesseract）：简单但需要外部依赖

**推荐**：`tesseract.js`（v5），因为它：
- 纯 JavaScript，不依赖系统环境
- npm 安装即用
- 支持中文（chi_sim 训练包）

**2. extract action 扩展**

```typescript
case 'extract': {
  if (config.source === 'screenshot') {
    const lastScreenshot = context.lastScreenshot?.path;
    if (!lastScreenshot) {
      throw new Error('没有可用的截图用于 OCR 提取');
    }
    const text = await ocrService.recognize(lastScreenshot, { lang: config.lang ?? 'chi_sim+eng' });
    context.variables.set(config.variableName, text);
    return {
      action: 'extract',
      passed: true,
      extractedVar: { variableName: config.variableName, value: text },
      ocr: { text },
    };
  }
  // ... 现有逻辑 ...
}
```

**3. OCR Service**

```typescript
// packages/plugin-api/src/ocr-service.ts
import { createWorker } from 'tesseract.js';

export class OcrService {
  private worker?: Tesseract.Worker;

  async initialize(lang: string = 'chi_sim+eng') {
    this.worker = await createWorker(lang);
  }

  async recognize(imagePath: string, options?: { lang?: string }): Promise<string> {
    if (!this.worker) await this.initialize(options?.lang);
    const result = await this.worker!.recognize(imagePath);
    return result.data.text;
  }

  async terminate() {
    await this.worker?.terminate();
    this.worker = undefined;
  }
}
```

### 前端实现细节

extract action 配置 UI：
- `source` 下拉新增 `screenshot`
- 当选择 `screenshot` 时显示：
  - `lang` 下拉：中文 / 英文 / 中英混合（对应 tesseract.js 语言包）
  - `variableName` 输入框

### 验收标准
- [ ] 安装 tesseract.js 依赖后不影响现有构建
- [ ] 可以从截图中提取文字并存入变量
- [ ] 支持中英文 OCR
- [ ] Dogfooding 用例：截图包含特定文字，OCR 提取后断言文字内容

### 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| tesseract.js 训练数据包体积大（~10MB/语言） | 安装包变大 | 首次运行时按需下载训练数据，不打包进产物 |
| OCR 识别准确率有限 | 测试不可靠 | 使用 `contains` 而非 `equals` 做断言，容忍小误差 |
| 性能：OCR 处理耗时 | 用例执行变慢 | 异步执行，支持 timeout 配置；复杂页面可限制 ROI 区域 |

---

## Phase C：视觉回归比对（高复杂度）

### 目标
支持将当前截图与基准图（baseline）进行像素级 diff，计算差异率，验证 UI 布局/样式没有意外变化。

### 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/plugin-api/package.json` | **修改** | 新增 `pixelmatch` + `sharp` / `pngjs` 依赖 |
| `packages/plugin-api/src/browser-executor.ts` | **修改** | `assert` action 新增 `visualDiff` 类型 |
| `packages/plugin-api/src/visual-regression-service.ts` | **新建** | 视觉回归比对核心逻辑 |
| `packages/server/src/routes/` | **修改** | 新增/扩展 baseline 图片上传、存储、管理 API |
| `packages/web/src/pages/test-cases.tsx` | **修改** | 用例编辑页面增加 baseline 图片上传/管理 UI |
| `packages/web/src/components/run-result/` | **修改** | 运行结果页面展示 diff 对比图（before/after/diff） |
| `packages/web/src/i18n/locales/zh-CN.ts` | **修改** | 大量新增翻译键 |
| `packages/web/src/i18n/locales/en.ts` | **修改** | 大量新增对应英文翻译键 |

### 后端实现细节

**1. 依赖选择**

- `pixelmatch`：最流行的像素级图像比对库，轻量、纯 JS、输出 diff 图
- `sharp` 或 `pngjs`：读取 PNG 为像素 Buffer

**2. Visual Regression Service**

```typescript
// packages/plugin-api/src/visual-regression-service.ts
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'node:fs/promises';

export interface VisualDiffResult {
  diffCount: number;        // 不同像素数
  diffPercentage: number;   // 差异率 %
  passed: boolean;          // 是否低于阈值
  diffImagePath?: string;   // 差异图路径
}

export class VisualRegressionService {
  async compare(
    baselinePath: string,
    currentPath: string,
    options: {
      threshold?: number;        // 像素差异阈值（0-1），默认 0.1
      diffPercentageThreshold?: number; // 差异率阈值（%），默认 1.0
      outputDir: string;
    }
  ): Promise<VisualDiffResult> {
    const [baselineBuf, currentBuf] = await Promise.all([
      fs.readFile(baselinePath),
      fs.readFile(currentPath),
    ]);

    const baseline = PNG.sync.read(baselineBuf);
    const current = PNG.sync.read(currentBuf);

    // 尺寸不一致时直接失败或 resize
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return { diffCount: -1, diffPercentage: 100, passed: false };
    }

    const { width, height } = baseline;
    const diff = new PNG({ width, height });
    const diffCount = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold: options.threshold ?? 0.1 }
    );

    const totalPixels = width * height;
    const diffPercentage = (diffCount / totalPixels) * 100;
    const passed = diffPercentage <= (options.diffPercentageThreshold ?? 1.0);

    const diffImagePath = path.join(options.outputDir, `diff-${Date.now()}.png`);
    await fs.writeFile(diffImagePath, PNG.sync.write(diff));

    return { diffCount, diffPercentage, passed, diffImagePath };
  }
}
```

**3. assert action 新增 visualDiff 类型**

```typescript
case 'visualDiff': {
  const baselineId = assertion.baselineId; // 基准图 ID（存储在服务器上）
  const currentScreenshot = context.lastScreenshot?.path;
  if (!currentScreenshot) {
    throw new Error('没有可用的截图用于视觉回归比对');
  }

  // 从服务器获取 baseline 图片到本地临时路径
  const baselinePath = await this.downloadBaseline(baselineId, context.runId);

  const result = await visualRegressionService.compare(baselinePath, currentScreenshot, {
    threshold: assertion.threshold ?? 0.1,
    diffPercentageThreshold: assertion.expected ?? 1.0,
    outputDir: this.getScreenshotDir(context.runId),
  });

  actual = result.diffPercentage;
  expected = assertion.expected ?? 1.0;
  // operator 固定为 'lte'（差异率 <= 阈值）

  return {
    action: 'assert',
    passed: result.passed,
    assertion: {
      type: 'visualDiff',
      baselineId,
      operator: 'lte',
      expected,
      actual,
      passed: result.passed,
      diffImage: result.diffImagePath,
    },
  };
}
```

**4. Baseline 图片存储**

- 存储位置：项目级（每个项目有自己的 baseline 图库）
- 数据模型扩展：`BaselineImage` 表
  - id, projectId, name, filePath, width, height, createdAt, updatedAt
- API：
  - `POST /api/v1/projects/:id/baselines` — 上传 baseline
  - `GET /api/v1/projects/:id/baselines` — 列表
  - `DELETE /api/v1/projects/:id/baselines/:baselineId` — 删除
  - `GET /api/v1/projects/:id/baselines/:baselineId/file` — 下载图片

### 前端实现细节

**1. 用例编辑页面 - Baseline 管理**

在用例编辑页面（或独立的 Baseline 管理页面）中：
- 显示当前项目已有的 baseline 图片列表
- 支持上传新的 baseline（拖拽或选择文件）
- 支持为 baseline 命名

**2. assert visualDiff 配置 UI**

当 `action === "assert"` 且 `assertion.type === "visualDiff"` 时：
- `baselineId`：下拉选择当前项目的 baseline 图片（显示名称 + 缩略图）
- `threshold`：像素差异阈值滑块（0-1，默认 0.1）
- `expected`：差异率阈值输入（%，默认 1.0）

**3. 运行结果页面 - Diff 展示**

当运行结果包含 `visualDiff` 断言时：
- 三栏对比：Baseline（左）/ Current（中）/ Diff（右）
- Diff 图用红色高亮差异区域
- 显示差异率数值

### 验收标准
- [ ] 可以上传和管理 baseline 图片
- [ ] assert action 支持 `visualDiff` 类型
- [ ] 视觉回归比对生成 diff 图
- [ ] 差异率超过阈值时测试失败
- [ ] 运行结果页面展示 before/after/diff 对比
- [ ] Dogfooding 用例：UI 变化触发 visualDiff 失败

### 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 字体/抗锯齿渲染差异导致误报 | 测试不稳定 | 调整 threshold；使用 `pixelmatch` 的 `includeAA` 选项忽略抗锯齿差异 |
| 动态内容（时间、随机数）导致差异 | 误报 | 支持在截图前隐藏/替换动态元素（通过 CSS 注入） |
| 不同操作系统/浏览器渲染差异 | 跨环境不一致 | baseline 在同一环境生成；CI 环境固定 |
| baseline 管理复杂 | 维护成本高 | 支持批量更新 baseline；UI 一键"接受当前为 baseline" |

---

## 三阶段依赖关系

```
Phase A ──→ Phase B ──→ Phase C
(元数据)    (OCR)       (像素比对)
   ↑           ↑            ↑
  无依赖    依赖 A的     依赖 A的
            context      screenshot
            基础设施     基础设施 +
                         baseline 管理
```

- **Phase B 依赖 Phase A**：OCR 提取依赖 `lastScreenshot` 上下文机制
- **Phase C 依赖 Phase A**：视觉回归比对依赖截图路径获取；可独立于 B
- 三个 Phase 可顺序实施，也可 A→C 跳过 B（如果 OCR 不是强需求）

---

## 总体时间预估

| Phase | 预估工作量 | 关键路径 |
|-------|-----------|---------|
| A | 0.5-1 天 | 后端扩展 + 前端配置 UI |
| B | 1-2 天 | OCR 库调研与集成 + 中英识别调优 |
| C | 3-5 天 | baseline 管理后端 + diff 展示前端 |

---

## 与现有系统的兼容性

- 所有增强均为**向后兼容**的新增能力，不影响现有 screenshot/assert/extract action 的行为
- `assert` action 的 `evaluateAssertion` 需要扩展 `gt`/`gte`/`lt`/`lte` 运算符（Phase A 中实现）
- `RunContext` 需要新增 `lastScreenshot` 字段（Phase A 中实现）
