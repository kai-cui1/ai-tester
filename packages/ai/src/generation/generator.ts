import { z } from 'zod';
import type { LlmProvider } from '../providers/types.js';
import type { ApiEndpoint } from '../models/api-endpoint.js';
import type {
  GenerationStrategy,
  GeneratedTestCasePreview,
} from '../models/generation.js';
import { GeneratedTestCasePreviewSchema } from '../models/generation.js';
import { STRATEGIES } from './strategies.js';
import { buildSystemPrompt, buildEndpointsContext, buildUserPrompt } from './prompts.js';

const GenerationResultSchema = z.object({
  testCases: z.array(GeneratedTestCasePreviewSchema),
});

export interface GeneratorDeps {
  provider: LlmProvider;
}

export class TestCaseGenerator {
  private provider: LlmProvider;

  constructor(deps: GeneratorDeps) {
    this.provider = deps.provider;
  }

  async generate(
    endpoints: ApiEndpoint[],
    strategy: GenerationStrategy,
    customPrompt?: string,
  ): Promise<GeneratedTestCasePreview[]> {
    if (endpoints.length === 0) {
      throw new Error('At least one endpoint is required for generation');
    }

    const strategyDef = STRATEGIES[strategy];
    if (!strategyDef) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }

    const systemPrompt = buildSystemPrompt(strategyDef.systemPromptAddition, customPrompt);
    const endpointsContext = buildEndpointsContext(endpoints);
    const userPrompt = buildUserPrompt(endpointsContext);

    const result = await this.provider.structuredOutput(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      GenerationResultSchema,
      { temperature: 0.7 },
    );

    return result.testCases;
  }
}
