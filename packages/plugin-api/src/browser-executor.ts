import { chromium, type Browser, type Page } from 'playwright';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import type { Executor, StepExecutionResult } from '@ai-tester/core';
import type { RunContext } from '@ai-tester/core';
import type { TestStep } from '@ai-tester/core';
import { BrowserStepConfigSchema } from '@ai-tester/core';

export class BrowserExecutor implements Executor {
  readonly type = 'browser';
  readonly configSchema = BrowserStepConfigSchema;

  private browser?: Browser;

  async setup(context: RunContext): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    const page = await this.browser.newPage();
    context.browserPage = page;
  }

  async teardown(context: RunContext): Promise<void> {
    await context.browserPage?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    context.browserPage = undefined;
    this.browser = undefined;
  }

  async execute(step: TestStep, context: RunContext): Promise<StepExecutionResult> {
    const config = BrowserStepConfigSchema.parse(step.config);
    const startTime = Date.now();

    // Ensure browser is started
    if (!context.browserPage) {
      await this.setup(context);
    }
    const page = context.browserPage as Page;

    try {
      const result = await this.executeAction(config, page, context);
      const durationMs = Date.now() - startTime;

      return {
        status: result.passed ? 'passed' : 'failed',
        durationMs,
        browser: {
          action: config.action,
          url: result.url,
          title: result.title,
          screenshot: result.screenshot,
          assertion: result.assertion,
        },
        assertion: result.assertion && !result.assertion.passed
          ? {
              expression: `${result.assertion.type}${result.assertion.selector ? ` on ${result.assertion.selector}` : ''}`,
              operator: result.assertion.operator,
              expected: result.assertion.expected,
              actual: result.assertion.actual,
              passed: result.assertion.passed,
            }
          : undefined,
        extractedVar: result.extractedVar,
      };
    } catch (err: any) {
      // Auto-screenshot on error
      let screenshot: string | undefined;
      try {
        const screenshotDir = this.getScreenshotDir(context.runId);
        await fs.mkdir(screenshotDir, { recursive: true });
        const screenshotPath = path.join(screenshotDir, `${step.id}-error.png`);
        await page.screenshot({ path: screenshotPath });
        screenshot = screenshotPath;
        context.screenshots.push(screenshotPath);
      } catch { /* ignore screenshot errors */ }

      return {
        status: 'error',
        error: { message: err.message, stack: err.stack },
        durationMs: Date.now() - startTime,
        browser: { action: config.action, screenshot },
      };
    }
  }

  private getScreenshotDir(runId: string): string {
    return path.join(os.tmpdir(), 'ai-tester-screenshots', runId);
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
        const screenshotDir = this.getScreenshotDir(context.runId);
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
        throw new Error(`不支持的浏览器操作: ${config.action}`);
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
        throw new Error(`不支持的断言类型: ${assertion.type}`);
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
