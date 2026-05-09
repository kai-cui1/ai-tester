import { JSONPath } from 'jsonpath-plus';
import type { Executor, StepExecutionResult } from '@ai-tester/core';
import type { RunContext } from '@ai-tester/core';
import type { TestStep } from '@ai-tester/core';
import { AssertionStepConfigSchema } from '@ai-tester/core';

export class AssertionExecutor implements Executor {
  readonly type = 'assertion';
  readonly configSchema = AssertionStepConfigSchema;

  async execute(step: TestStep, context: RunContext): Promise<StepExecutionResult> {
    const config = AssertionStepConfigSchema.parse(step.config);
    const startTime = Date.now();

    try {
      const actual = this.resolveActual(config.source, config.expression, context);
      const expected = config.expected !== undefined
        ? context.resolveTemplateDeep(config.expected)
        : undefined;
      const passed = this.evaluate(config.operator, actual, expected);

      return {
        status: passed ? 'passed' : 'failed',
        assertion: {
          expression: config.expression,
          operator: config.operator,
          expected,
          actual,
          passed,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        status: 'error',
        error: { message: err.message, stack: err.stack },
        durationMs: Date.now() - startTime,
      };
    }
  }

  private resolveActual(source: string, expression: string | undefined, context: RunContext): any {
    const resp = context.lastResponse;

    switch (source) {
      case 'status':
        return resp?.status;
      case 'header':
        if (!expression) throw new Error('Assertion on "header" requires expression (header name)');
        return resp?.headers?.[expression.toLowerCase()];
      case 'body':
        return resp?.body;
      case 'jsonpath':
        if (!expression) throw new Error('Assertion on "jsonpath" requires expression');
        if (!resp?.body) return undefined;
        const results = JSONPath({ path: expression, json: resp.body, wrap: false });
        return results;
      case 'variable':
        if (!expression) throw new Error('Assertion on "variable" requires expression (variable name)');
        return context.variables.get(expression);
      default:
        throw new Error(`Unknown assertion source: ${source}`);
    }
  }

  private evaluate(operator: string, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return JSON.stringify(actual) === JSON.stringify(expected);
      case 'not_equals':
        return JSON.stringify(actual) !== JSON.stringify(expected);
      case 'contains':
        if (typeof actual === 'string') return actual.includes(String(expected));
        if (Array.isArray(actual)) {
          // 优先精确匹配数组元素
          if (actual.includes(expected)) return true;
          // 若期望是字符串，也支持检查数组中是否有字符串元素包含该子串
          if (typeof expected === 'string') {
            return actual.some(item => typeof item === 'string' && item.includes(expected));
          }
          return false;
        }
        return false;
      case 'not_contains':
        if (typeof actual === 'string') return !actual.includes(String(expected));
        if (Array.isArray(actual)) {
          if (actual.includes(expected)) return false;
          if (typeof expected === 'string') {
            return !actual.some(item => typeof item === 'string' && item.includes(expected));
          }
          return true;
        }
        return true;
      case 'gt':
        return Number(actual) > Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'matches':
        return new RegExp(String(expected)).test(String(actual));
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'not_exists':
        return actual === undefined || actual === null;
      case 'type_is':
        return this.checkType(actual, String(expected));
      default:
        throw new Error(`Unknown assertion operator: ${operator}`);
    }
  }

  private checkType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
      default: return typeof value === expectedType;
    }
  }
}
