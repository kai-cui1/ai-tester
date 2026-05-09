import type { ZodType, ZodTypeDef } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  durationMs: number;
  logs: string[];
}

export interface LlmProvider {
  /** Free-text chat completion */
  chatCompletion(messages: ChatMessage[], options?: LlmOptions): Promise<string>;

  /** Structured output with Zod schema validation */
  structuredOutput<T>(
    messages: ChatMessage[],
    schema: ZodType<T, ZodTypeDef, any>,
    options?: LlmOptions,
  ): Promise<T>;

  /** Test connectivity with detailed logs */
  testConnection(): Promise<TestConnectionResult>;
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmResponse {
  content: string;
  usage?: LlmUsage;
}
