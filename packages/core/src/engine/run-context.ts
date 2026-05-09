import { EventEmitter } from 'node:events';
import type { Environment } from '../models/index.js';

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  responseTimeMs: number;
}

export class RunContext {
  public readonly runId: string;
  public readonly environment: Environment;
  public readonly variables: Map<string, any>;
  public readonly eventEmitter: EventEmitter;
  public lastResponse?: HttpResponse;

  constructor(
    runId: string,
    environment: Environment,
    initialVariables?: Record<string, any>,
  ) {
    this.runId = runId;
    this.environment = environment;
    this.variables = new Map(Object.entries(initialVariables ?? {}));
    this.eventEmitter = new EventEmitter();

    // Pre-populate environment variables
    this.variables.set('baseUrl', environment.baseUrl);
    for (const [key, value] of Object.entries(environment.variables)) {
      this.variables.set(key, value);
    }
  }

  resolveTemplate(template: string): string {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\{(\w+(?:\.\w+)*(?:\[\d+\])?(?:\.\w+)*)\}\}/g, (_match, path: string) => {
      const value = this.resolvePath(path);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }

  resolveTemplateDeep(obj: any): any {
    if (typeof obj === 'string') return this.resolveTemplate(obj);
    if (Array.isArray(obj)) return obj.map((item) => this.resolveTemplateDeep(item));
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveTemplateDeep(value);
      }
      return result;
    }
    return obj;
  }

  private resolvePath(path: string): any {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current: any = undefined;

    // Start with the first part as variable name
    const firstPart = parts[0];
    current = this.variables.get(firstPart);

    // Navigate remaining parts
    for (let i = 1; i < parts.length && current !== undefined; i++) {
      const part = parts[i];
      const index = Number(part);
      if (!isNaN(index) && Array.isArray(current)) {
        current = current[index];
      } else if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
