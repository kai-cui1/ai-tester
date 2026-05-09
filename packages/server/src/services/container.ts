import {
  PluginRegistry,
  PrismaProjectRepository,
  PrismaTestCaseRepository,
  PrismaTestSuiteRepository,
  PrismaTestRunRepository,
  PrismaTestDataSetRepository,
  Orchestrator,
} from '@ai-tester/core';
import {
  PrismaAiModelRepository,
  PrismaAiProviderConfigRepository,
  PrismaApiEndpointRepository,
  PrismaGenerationTaskRepository,
} from '@ai-tester/ai';
import { registerApiPlugins } from '@ai-tester/plugin-api';

// Repositories (singletons)
export const projectRepo = new PrismaProjectRepository();
export const testCaseRepo = new PrismaTestCaseRepository();
export const testSuiteRepo = new PrismaTestSuiteRepository();
export const testRunRepo = new PrismaTestRunRepository();
export const testDataSetRepo = new PrismaTestDataSetRepository();

// AI Repositories (singletons)
export const aiModelRepo = new PrismaAiModelRepository();
export const aiProviderConfigRepo = new PrismaAiProviderConfigRepository();
export const apiEndpointRepo = new PrismaApiEndpointRepository();
export const generationTaskRepo = new PrismaGenerationTaskRepository();

// Plugin registry
export const registry = new PluginRegistry();
registerApiPlugins(registry);

// Orchestrator
export const orchestrator = new Orchestrator({
  registry,
  testCaseRepo,
  testSuiteRepo,
  testRunRepo,
  testDataSetRepo,
  projectRepo,
});
