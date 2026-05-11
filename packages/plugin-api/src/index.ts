import { PluginRegistry } from '@ai-tester/core';
import { HttpExecutor } from './http-executor.js';
import { AssertionExecutor } from './assertions.js';
import { ExtractExecutor } from './extractors.js';
import { BrowserExecutor } from './browser-executor.js';

export { HttpExecutor } from './http-executor.js';
export { AssertionExecutor } from './assertions.js';
export { ExtractExecutor } from './extractors.js';
export { BrowserExecutor } from './browser-executor.js';

export function registerApiPlugins(registry: PluginRegistry): void {
  registry.register(new HttpExecutor());
  registry.register(new AssertionExecutor());
  registry.register(new ExtractExecutor());
  registry.register(new BrowserExecutor());
}
