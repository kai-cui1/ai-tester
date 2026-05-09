import type { ZodSchema } from 'zod';
import type { TestStep, TestStepResult } from '../models/index.js';
import type { RunContext } from '../engine/run-context.js';

export interface StepExecutionResult {
  status: 'passed' | 'failed' | 'error' | 'skipped';
  request?: { method: string; url: string; headers?: Record<string, string>; body?: any };
  response?: { status: number; headers?: Record<string, string>; body?: any; responseTimeMs: number };
  assertion?: { expression?: string; operator: string; expected?: any; actual?: any; passed: boolean };
  extractedVar?: { variableName: string; value: any };
  error?: { message: string; stack?: string };
  durationMs: number;
}

export interface Executor {
  readonly type: string;
  readonly configSchema: ZodSchema;

  execute(step: TestStep, context: RunContext): Promise<StepExecutionResult>;
  setup?(context: RunContext): Promise<void>;
  teardown?(context: RunContext): Promise<void>;
}
