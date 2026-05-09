import type { GenerationStrategy } from '../models/generation.js';

export interface StrategyDefinition {
  id: GenerationStrategy;
  name: string;
  description: string;
  systemPromptAddition: string;
}

export const STRATEGIES: Record<GenerationStrategy, StrategyDefinition> = {
  happy_path: {
    id: 'happy_path',
    name: 'Happy Path',
    description: 'Generate test cases for normal/expected usage scenarios',
    systemPromptAddition:
      'Focus on testing the normal, expected flow of each API endpoint. ' +
      'Use valid input data, correct authentication, and verify successful responses (2xx status codes). ' +
      'Test the primary use case of each endpoint.',
  },
  error_cases: {
    id: 'error_cases',
    name: 'Error Cases',
    description: 'Generate test cases for error handling and edge cases',
    systemPromptAddition:
      'Focus on testing error handling and edge cases. ' +
      'Test with invalid inputs, missing required fields, wrong data types, boundary values, ' +
      'and verify appropriate error responses (4xx/5xx status codes with meaningful error messages).',
  },
  auth_cases: {
    id: 'auth_cases',
    name: 'Authentication Cases',
    description: 'Generate test cases for authentication and authorization',
    systemPromptAddition:
      'Focus on testing authentication and authorization scenarios. ' +
      'Test with missing tokens, expired tokens, invalid tokens, wrong permissions, ' +
      'and verify that endpoints properly enforce authentication requirements.',
  },
  comprehensive: {
    id: 'comprehensive',
    name: 'Comprehensive',
    description: 'Generate a comprehensive set covering happy path, errors, and auth',
    systemPromptAddition:
      'Generate a comprehensive set of test cases covering: ' +
      '1) Happy path scenarios with valid inputs and expected outputs, ' +
      '2) Error handling with invalid inputs, missing fields, boundary values, ' +
      '3) Authentication/authorization checks if applicable. ' +
      'Aim for thorough coverage of each endpoint.',
  },
};
