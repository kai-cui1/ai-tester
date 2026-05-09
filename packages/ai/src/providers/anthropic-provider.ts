import type { ZodType, ZodTypeDef } from 'zod';
import type { ChatMessage, LlmOptions, LlmProvider, TestConnectionResult } from './types.js';

export interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

export class AnthropicProvider implements LlmProvider {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096;
    // Normalize baseURL: Anthropic SDK appends /v1/messages to base_url
    let url = config.baseURL ?? '';
    if (url && !url.endsWith('/v1')) {
      url = url.replace(/\/$/, '') + '/v1';
    }
    this.baseURL = url;
  }

  private async fetchMessages(
    messages: AnthropicMessage[],
    system?: string,
    options?: LlmOptions,
  ): Promise<AnthropicResponse> {
    const body: any = {
      model: this.model,
      messages,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      temperature: options?.temperature ?? this.defaultTemperature,
    };
    if (system) body.system = system;

    const res = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}${text ? ': ' + text : ''}`);
    }

    return res.json() as Promise<AnthropicResponse>;
  }

  async chatCompletion(messages: ChatMessage[], options?: LlmOptions): Promise<string> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages: AnthropicMessage[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.fetchMessages(chatMessages, systemMessage?.content, options);
    const text = response.content.find((c) => c.type === 'text')?.text;
    if (!text) {
      throw new Error('LLM returned empty response');
    }
    return text;
  }

  async structuredOutput<T>(
    messages: ChatMessage[],
    schema: ZodType<T, ZodTypeDef, any>,
    options?: LlmOptions,
  ): Promise<T> {
    const jsonPrompt = `You must respond with a valid JSON object that conforms to the following schema. Do not include any other text outside the JSON object.`;

    const augmentedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: jsonPrompt },
    ];

    const text = await this.chatCompletion(augmentedMessages, options);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  }

  /** Test connectivity with detailed logs */
  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    const url = `${this.baseURL}/messages`;
    try {
      const body = {
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
        temperature: this.defaultTemperature,
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const duration = Date.now() - start;
      const raw = await res.text();

      // Check for business-level errors even when HTTP status is 200
      let json: any;
      try { json = JSON.parse(raw); } catch { json = null; }

      const hasBusinessError = json && (
        json.success === false ||
        (json.code !== undefined && json.code !== 200) ||
        json.error
      );

      if (!res.ok || hasBusinessError) {
        const errMsg = json?.msg || json?.error?.message || json?.error || `${res.status} ${res.statusText}`;
        return {
          success: false,
          message: errMsg,
          durationMs: duration,
          logs: [
            `[Config] Model: ${this.model}, Base URL: ${this.baseURL}`,
            `[Request] POST ${url} - test message "Hello"`,
            `[Response] ${res.status} ${res.statusText}`,
            `[Body] ${raw.slice(0, 500)}`,
            `[Duration] ${duration}ms`,
          ],
        };
      }

      let replyText = '(empty)';
      if (json) {
        if (Array.isArray(json.content)) {
          replyText = json.content.find((c: any) => c.type === 'text')?.text?.trim() || '(empty)';
        } else if (json.content) {
          replyText = String(json.content).slice(0, 100);
        } else if (json.choices) {
          replyText = json.choices[0]?.message?.content?.trim() || '(empty)';
        } else {
          replyText = JSON.stringify(json).slice(0, 100);
        }
      } else {
        replyText = raw.slice(0, 100);
      }

      return {
        success: true,
        message: 'Connection successful',
        durationMs: duration,
        logs: [
          `[Config] Model: ${this.model}, Base URL: ${this.baseURL}`,
          `[Request] POST ${url} - test message "Hello"`,
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
          `[Config] Model: ${this.model}, Base URL: ${this.baseURL}`,
          `[Request] POST ${url} - test message "Hello"`,
          `[Error] ${(err as Error).message}`,
          `[Duration] ${duration}ms`,
        ],
      };
    }
  }
}
