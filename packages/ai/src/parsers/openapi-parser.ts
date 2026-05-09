import type { CreateApiEndpoint } from '../models/api-endpoint.js';
import type { KnowledgeParser } from './types.js';

interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  paths?: Record<string, Record<string, any>>;
  [key: string]: any;
}

export class OpenApiParser implements KnowledgeParser<string> {
  async parse(input: string, projectId: string): Promise<CreateApiEndpoint[]> {
    const spec: OpenApiSpec = JSON.parse(input);
    const endpoints: CreateApiEndpoint[] = [];

    if (!spec.paths) {
      throw new Error('Invalid OpenAPI/Swagger document: missing "paths" field');
    }

    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!httpMethods.includes(method.toLowerCase())) continue;

        const op = operation as any;

        const parameters = (op.parameters || []).map((p: any) => ({
          name: p.name,
          in: p.in,
          type: p.schema?.type || p.type || 'string',
          required: p.required || false,
          description: p.description,
        }));

        let requestBody: string | undefined;
        if (op.requestBody) {
          const content = op.requestBody.content;
          const jsonSchema = content?.['application/json']?.schema;
          requestBody = jsonSchema ? JSON.stringify(jsonSchema) : undefined;
        }

        let responseBody: string | undefined;
        const response200 = op.responses?.['200'] || op.responses?.['201'];
        if (response200?.content?.['application/json']?.schema) {
          responseBody = JSON.stringify(response200.content['application/json'].schema);
        }

        // Detect authentication
        let authentication: 'bearer' | 'api-key' | 'basic' | 'none' | undefined;
        if (op.security && op.security.length > 0) {
          const securityNames = Object.keys(op.security[0] || {});
          if (securityNames.length > 0) {
            const secDef =
              spec.components?.securitySchemes?.[securityNames[0]] ||
              spec.securityDefinitions?.[securityNames[0]];
            if (secDef) {
              if (secDef.type === 'http' && secDef.scheme === 'bearer') authentication = 'bearer';
              else if (secDef.type === 'http' && secDef.scheme === 'basic') authentication = 'basic';
              else if (secDef.type === 'apiKey') authentication = 'api-key';
            }
          }
        }

        endpoints.push({
          projectId,
          method: method.toUpperCase(),
          path,
          summary: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
          description: op.description || undefined,
          tags: op.tags || [],
          parameters,
          requestBody: requestBody ?? undefined,
          responseBody: responseBody ?? undefined,
          authentication,
          source: 'openapi',
        });
      }
    }

    return endpoints;
  }
}
