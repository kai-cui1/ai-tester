import type { CreateApiEndpoint } from '../models/api-endpoint.js';
import type { KnowledgeParser } from './types.js';

export class CurlParser implements KnowledgeParser<string> {
  async parse(input: string, projectId: string): Promise<CreateApiEndpoint[]> {
    const lines = input.trim().split('\n');
    const results: CreateApiEndpoint[] = [];

    // Join continuation lines (ending with \)
    const joined = lines
      .map((l) => l.trim())
      .join(' ')
      .replace(/\s*\\\s*/g, ' ');

    // Split multiple curl commands
    const curlCommands = joined.split(/(?=curl\s)/i).filter((c) => c.trim().startsWith('curl'));

    for (const cmd of curlCommands) {
      const endpoint = this.parseSingleCurl(cmd, projectId);
      if (endpoint) {
        results.push(endpoint);
      }
    }

    return results;
  }

  private parseSingleCurl(cmd: string, projectId: string): CreateApiEndpoint | null {
    // Extract URL
    const urlMatch = cmd.match(
      /(?:curl\s+(?:.*?\s+)?)(["']?)(https?:\/\/[^\s"']+)\1/i,
    ) || cmd.match(/curl\s+.*?(https?:\/\/[^\s"']+)/i);

    if (!urlMatch) return null;

    const fullUrl = urlMatch[2] || urlMatch[1];
    let url: URL;
    try {
      url = new URL(fullUrl);
    } catch {
      return null;
    }

    // Extract method
    let method = 'GET';
    const methodMatch = cmd.match(/-X\s+["']?(\w+)["']?/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    } else if (cmd.includes('-d ') || cmd.includes('--data')) {
      method = 'POST';
    }

    // Extract path
    const path = url.pathname;

    // Extract headers
    const headers: Record<string, string> = {};
    const headerRegex = /-H\s+["']([^"']+)["']/gi;
    let hMatch;
    while ((hMatch = headerRegex.exec(cmd)) !== null) {
      const [key, ...valueParts] = hMatch[1].split(':');
      if (key && valueParts.length) {
        headers[key.trim().toLowerCase()] = valueParts.join(':').trim();
      }
    }

    // Extract request body
    let requestBody: string | undefined;
    const dataMatch = cmd.match(/(?:--data(?:-raw)?|-d)\s+["'](.+?)["']/s);
    if (dataMatch) {
      try {
        const parsed = JSON.parse(dataMatch[1]);
        requestBody = JSON.stringify({ type: 'object', example: parsed });
      } catch {
        requestBody = dataMatch[1];
      }
    }

    // Detect auth
    let authentication: 'bearer' | 'api-key' | 'basic' | 'none' | undefined;
    const authHeader = headers['authorization'];
    if (authHeader) {
      if (authHeader.toLowerCase().startsWith('bearer')) authentication = 'bearer';
      else if (authHeader.toLowerCase().startsWith('basic')) authentication = 'basic';
    }

    // Extract query parameters
    const parameters = Array.from(url.searchParams.entries()).map(([name]) => ({
      name,
      in: 'query' as const,
      type: 'string',
      required: false,
    }));

    return {
      projectId,
      method,
      path,
      summary: `${method} ${path}`,
      description: `Parsed from cURL command`,
      tags: [],
      parameters,
      requestBody: requestBody ?? undefined,
      authentication,
      source: 'curl',
    };
  }
}
