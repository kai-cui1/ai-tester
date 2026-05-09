import type { Executor } from './executor.js';

export class PluginRegistry {
  private executors = new Map<string, Executor>();

  register(executor: Executor): void {
    if (this.executors.has(executor.type)) {
      throw new Error(`Executor type "${executor.type}" is already registered`);
    }
    this.executors.set(executor.type, executor);
  }

  get(type: string): Executor | undefined {
    return this.executors.get(type);
  }

  getOrThrow(type: string): Executor {
    const executor = this.executors.get(type);
    if (!executor) {
      throw new Error(`No executor registered for type "${type}". Available: ${this.listTypes().join(', ')}`);
    }
    return executor;
  }

  listTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}
