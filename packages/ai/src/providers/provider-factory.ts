import type { AiModel, AiProvider, AiApiFormat } from '../models/ai-model.js';
import type { LlmProvider } from './types.js';
import { OpenAiProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import type { AiConfig as LegacyAiConfig } from '../models/ai-config.js';

export interface ProviderFactoryInput {
  provider: AiProvider;
  apiFormat?: AiApiFormat;
  model: string;
  apiKey: string; // decrypted
  baseUrl?: string | null;
  temperature?: number;
  maxTokens?: number;
}

export function createProvider(config: ProviderFactoryInput): LlmProvider {
  const isAnthropicFormat = config.apiFormat === 'anthropic';

  if (isAnthropicFormat) {
    return new AnthropicProvider({
      apiKey: config.apiKey,
      model: config.model,
      baseURL: config.baseUrl ?? undefined,
      defaultTemperature: config.temperature,
      defaultMaxTokens: config.maxTokens,
    });
  }

  return new OpenAiProvider({
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseUrl ?? undefined,
    defaultTemperature: config.temperature,
    defaultMaxTokens: config.maxTokens,
  });
}

/** Create provider from AiModel (with decrypted API key) */
export function createProviderFromModel(
  model: AiModel,
  decryptedApiKey: string,
): LlmProvider {
  return createProvider({
    provider: model.provider,
    apiFormat: model.apiFormat,
    model: model.model,
    apiKey: decryptedApiKey,
    baseUrl: model.baseUrl,
    temperature: model.temperature,
    maxTokens: model.maxTokens,
  });
}

/** Create provider from legacy AiConfig (with decrypted API key) */
export function createProviderFromConfig(
  config: LegacyAiConfig,
  decryptedApiKey: string,
): LlmProvider {
  return createProvider({
    provider: config.provider,
    model: config.model,
    apiKey: decryptedApiKey,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}
