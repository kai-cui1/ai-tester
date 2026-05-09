import type { ApiEndpoint } from '../models/api-endpoint.js';

export function buildSystemPrompt(strategyAddition: string, customPrompt?: string): string {
  let prompt = `You are an expert API test case generator. Your job is to generate structured test cases for API endpoints.

Each test case should include:
- A clear, descriptive name
- A description of what is being tested
- Appropriate module grouping
- Relevant tags
- Priority level (low/medium/high/critical)
- One or more test steps

For HTTP test steps, include:
- method: HTTP method (GET, POST, PUT, DELETE, etc.)
- url: The API endpoint path (use {{baseUrl}} as prefix)
- headers: Required headers (e.g., Content-Type, Authorization using {{token}} variable)
- body: Request body if applicable (as JSON string)

For assertion steps, include:
- source: What to assert on ("status", "body", "header", "responseTime")
- property: JSONPath or specific property to check
- operator: Comparison operator ("eq", "neq", "gt", "lt", "contains", "exists", "matches")
- expected: Expected value

Generate realistic, practical test data. Use variables like {{baseUrl}}, {{token}}, {{userId}} where appropriate.

${strategyAddition}`;

  if (customPrompt) {
    prompt += `\n\nAdditional instructions from user:\n${customPrompt}`;
  }

  return prompt;
}

export function buildEndpointsContext(endpoints: ApiEndpoint[]): string {
  return endpoints
    .map((ep) => {
      let desc = `## ${ep.method} ${ep.path}\n`;
      desc += `Summary: ${ep.summary}\n`;
      if (ep.description) desc += `Description: ${ep.description}\n`;
      if (ep.authentication) desc += `Authentication: ${ep.authentication}\n`;

      if (ep.parameters.length > 0) {
        desc += `Parameters:\n`;
        for (const p of ep.parameters) {
          desc += `  - ${p.name} (${p.in}, ${p.type}${p.required ? ', required' : ''}): ${p.description || 'N/A'}\n`;
        }
      }

      if (ep.requestBody) {
        desc += `Request Body Schema: ${ep.requestBody}\n`;
      }

      if (ep.responseBody) {
        desc += `Response Body Schema: ${ep.responseBody}\n`;
      }

      return desc;
    })
    .join('\n---\n');
}

export function buildUserPrompt(endpointsContext: string): string {
  return `Based on the following API endpoints, generate test cases. Each test case should have meaningful steps that can be executed against a real API.

API Endpoints:
${endpointsContext}

Generate test cases as a JSON array. Be thorough but practical.`;
}
