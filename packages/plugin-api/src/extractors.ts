import { JSONPath } from 'jsonpath-plus';
import type { Executor, StepExecutionResult } from '@ai-tester/core';
import type { RunContext } from '@ai-tester/core';
import type { TestStep } from '@ai-tester/core';
import { ExtractStepConfigSchema } from '@ai-tester/core';

export class ExtractExecutor implements Executor {
  readonly type = 'extract';
  readonly configSchema = ExtractStepConfigSchema;

  async execute(step: TestStep, context: RunContext): Promise<StepExecutionResult> {
    const config = ExtractStepConfigSchema.parse(step.config);
    const startTime = Date.now();

    try {
      const value = this.extractValue(config.source, config.expression, context);
      context.variables.set(config.variableName, value);

      return {
        status: 'passed',
        extractedVar: {
          variableName: config.variableName,
          value,
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

  private extractValue(source: string, expression: string | undefined, context: RunContext): any {
    const resp = context.lastResponse;

    switch (source) {
      case 'status':
        return resp?.status;

      case 'header': {
        if (!resp) throw new Error('No response available for header extraction');
        if (!expression) throw new Error('Header extraction requires expression (header name)');
        return resp.headers?.[expression.toLowerCase()];
      }

      case 'body':
        return resp?.body;

      case 'jsonpath': {
        if (!resp?.body) throw new Error('No response body available for JSONPath extraction');
        if (!expression) throw new Error('JSONPath extraction requires expression');
        const results = JSONPath({ path: expression, json: resp.body, wrap: false });
        return results;
      }

      case 'regex': {
        if (!resp?.body) throw new Error('No response body for regex extraction');
        if (!expression) throw new Error('Regex extraction requires expression');
        const bodyStr = typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body);
        const match = bodyStr.match(new RegExp(expression));
        if (!match) return undefined;
        return match[1] ?? match[0]; // Return first capture group or full match
      }

      default:
        throw new Error(`Unknown extract source: ${source}`);
    }
  }
}
