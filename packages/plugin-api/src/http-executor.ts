import { request } from 'undici';
import type { Executor, StepExecutionResult } from '@ai-tester/core';
import type { RunContext } from '@ai-tester/core';
import type { TestStep } from '@ai-tester/core';
import { HttpStepConfigSchema } from '@ai-tester/core';

export class HttpExecutor implements Executor {
  readonly type = 'http';
  readonly configSchema = HttpStepConfigSchema;

  async execute(step: TestStep, context: RunContext): Promise<StepExecutionResult> {
    const config = HttpStepConfigSchema.parse(step.config);

    const resolvedUrl = context.resolveTemplate(config.url);
    const resolvedHeaders = config.headers
      ? Object.fromEntries(
          Object.entries(config.headers).map(([k, v]) => [k, context.resolveTemplate(v)]),
        )
      : {};
    const resolvedBody = config.body ? context.resolveTemplateDeep(config.body) : undefined;

    // Set content type only when body is present
    if (resolvedBody !== undefined && config.contentType && !resolvedHeaders['content-type']) {
      resolvedHeaders['content-type'] = config.contentType;
    }

    const startTime = Date.now();

    try {
      const response = await request(resolvedUrl, {
        method: config.method,
        headers: resolvedHeaders,
        body: resolvedBody !== undefined ? JSON.stringify(resolvedBody) : undefined,
        signal: AbortSignal.timeout(config.timeout ?? 30000),
      });

      const responseTimeMs = Date.now() - startTime;

      // Read body
      let responseBody: any;
      const contentType = response.headers['content-type'];
      const bodyText = await response.body.text();

      try {
        responseBody = JSON.parse(bodyText);
      } catch {
        responseBody = bodyText;
      }

      // Build flat response headers
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (value) responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
      }

      // Store in context for assertion/extract steps
      context.lastResponse = {
        status: response.statusCode,
        headers: responseHeaders,
        body: responseBody,
        responseTimeMs,
      };

      return {
        status: 'passed',
        request: {
          method: config.method,
          url: resolvedUrl,
          headers: resolvedHeaders,
          body: resolvedBody,
        },
        response: {
          status: response.statusCode,
          headers: responseHeaders,
          body: responseBody,
          responseTimeMs,
        },
        durationMs: responseTimeMs,
      };
    } catch (err: any) {
      return {
        status: 'error',
        request: {
          method: config.method,
          url: resolvedUrl,
          headers: resolvedHeaders,
          body: resolvedBody,
        },
        error: { message: err.message, stack: err.stack },
        durationMs: Date.now() - startTime,
      };
    }
  }
}
