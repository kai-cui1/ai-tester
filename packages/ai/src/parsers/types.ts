import type { CreateApiEndpoint } from '../models/api-endpoint.js';

export interface KnowledgeParser<TInput> {
  parse(input: TInput, projectId: string): Promise<CreateApiEndpoint[]>;
}
