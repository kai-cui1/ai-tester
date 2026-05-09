import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ZodType, ZodTypeDef } from 'zod';
import type { ChatMessage, LlmOptions, LlmProvider, TestConnectionResult } from './types.js';

export interface OpenAiProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export class OpenAiProvider implements LlmProvider {
  private client: OpenAI;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenAiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model;
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
  }

  async chatCompletion(messages: ChatMessage[], options?: LlmOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response');
    }
    return content;
  }

  async structuredOutput<T>(
    messages: ChatMessage[],
    schema: ZodType<T, ZodTypeDef, any>,
    options?: LlmOptions,
  ): Promise<T> {
    const response = await this.client.beta.chat.completions.parse({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      response_format: zodResponseFormat(schema, 'result'),
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error('LLM returned no structured output');
    }
    return parsed;
  }

  /** Test connectivity with detailed logs */
  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    const baseURL = this.client.baseURL || 'https://api.openai.com/v1';
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      const duration = Date.now() - start;
      const replyText = response.choices[0]?.message?.content?.trim() || '(empty)';
      return {
        success: true,
        message: 'Connection successful',
        durationMs: duration,
        logs: [
          `[Config] Model: ${this.model}, Base URL: ${baseURL}`,
          `[Request] POST /chat/completions - test message "Hello"`,
          `[Response] 200 OK - reply: "${replyText}"`,
          `[Duration] ${duration}ms`,
        ],
      };
    } catch (err) {
      const duration = Date.now() - start;
      return {
        success: false,
        message: (err as Error).message,
        durationMs: duration,
        logs: [
          `[Config] Model: ${this.model}, Base URL: ${baseURL}`,
          `[Request] POST /chat/completions - test message "Hello"`,
          `[Error] ${(err as Error).message}`,
          `[Duration] ${duration}ms`,
        ],
      };
    }
  }
}
