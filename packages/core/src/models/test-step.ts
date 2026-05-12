import { z } from 'zod';

// --- Step Types ---

export const StepType = z.enum(['http', 'assertion', 'extract', 'call', 'load-dataset', 'browser']);
export type StepType = z.infer<typeof StepType>;

// --- Step Config Schemas ---

export const HttpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export const HttpStepConfigSchema = z.object({
  method: HttpMethod,
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  contentType: z.string().default('application/json'),
  timeout: z.number().positive().default(30000),
});

export const AssertionOperator = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'matches',
  'exists',
  'not_exists',
  'type_is',
]);

export const AssertionSource = z.enum(['status', 'header', 'body', 'jsonpath', 'variable']);

export const AssertionStepConfigSchema = z.object({
  source: AssertionSource,
  expression: z.string().optional(),
  operator: AssertionOperator,
  expected: z.any().optional(),
});

export const ExtractSource = z.enum(['body', 'jsonpath', 'header', 'status', 'regex']);

export const ExtractStepConfigSchema = z.object({
  source: ExtractSource,
  expression: z.string().optional(),
  variableName: z.string().min(1),
});

export const CallStepConfigSchema = z.object({
  testCaseId: z.string().min(1),
});

export const LoadDatasetStepConfigSchema = z.object({
  datasetId: z.string().min(1),
  variableName: z.string().min(1),
});

// --- Browser Step Config Schemas ---

export const BrowserAction = z.enum([
  'navigate',
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait',
  'screenshot',
  'assert',
  'extract',
  'keyboard',
  'goBack',
  'goForward',
  'close',
  // cookie / storage / session management
  'setCookie',
  'getCookie',
  'deleteCookie',
  'setLocalStorage',
  'getLocalStorage',
  'setSessionStorage',
  'getSessionStorage',
  'clearStorage',
  // file upload
  'uploadFile',
  // dialog handling
  'dialog',
]);

export const BrowserAssertionType = z.enum([
  'text',
  'value',
  'visible',
  'hidden',
  'url',
  'title',
  'attribute',
  'count',
  'screenshot',
  'visualDiff',
]);

export const BrowserAssertionOperator = z.enum(['equals', 'contains', 'matches', 'gt', 'gte', 'lt', 'lte']);

export const BrowserAssertionSchema = z.object({
  type: BrowserAssertionType,
  selector: z.string().optional(),
  expected: z.any().optional(),
  operator: BrowserAssertionOperator.default('equals'),
  attribute: z.string().optional(),
  // screenshot assertion: which property to check
  property: z.enum(['fileExists', 'width', 'height', 'size']).optional(),
  // visualDiff assertion: baseline image path and threshold
  baselinePath: z.string().optional(),
  threshold: z.number().min(0).max(1).default(0.1).optional(),
});

export const BrowserStepConfigSchema = z.object({
  action: BrowserAction,
  // navigate
  url: z.string().optional(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  // selector-based actions
  selector: z.string().optional(),
  // fill / select
  value: z.string().optional(),
  // fill options
  clear: z.boolean().default(true).optional(),
  // click options
  button: z.enum(['left', 'right', 'middle']).default('left').optional(),
  clickCount: z.number().int().min(1).default(1).optional(),
  force: z.boolean().default(false).optional(),
  // wait options
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional(),
  duration: z.number().positive().optional(),
  // screenshot options
  fullPage: z.boolean().default(false).optional(),
  // extract options
  variableName: z.string().optional(),
  attribute: z.string().optional(),
  source: z.enum(['dom', 'screenshot']).default('dom').optional(),
  lang: z.enum(['eng', 'chi_sim', 'chi_sim+eng']).default('chi_sim+eng').optional(),
  // assert
  assertion: BrowserAssertionSchema.optional(),
  // keyboard
  key: z.string().optional(),
  // cookie management
  cookieName: z.string().optional(),
  cookieValue: z.string().optional(),
  cookieDomain: z.string().optional(),
  cookiePath: z.string().optional(),
  cookieHttpOnly: z.boolean().default(false).optional(),
  cookieSecure: z.boolean().default(false).optional(),
  cookieSameSite: z.enum(['Strict', 'Lax', 'None']).default('Lax').optional(),
  // storage management
  storageKey: z.string().optional(),
  storageValue: z.string().optional(),
  storageType: z.enum(['localStorage', 'sessionStorage', 'all']).optional(),
  // file upload
  filePath: z.string().optional(),
  // dialog handling
  dialogAction: z.enum(['accept', 'dismiss']).default('accept').optional(),
  dialogPromptText: z.string().optional(),
  // global
  timeout: z.number().positive().default(30000).optional(),
});

// --- Union config schema for validation dispatch ---

export const StepConfigSchema = z.union([
  HttpStepConfigSchema,
  AssertionStepConfigSchema,
  ExtractStepConfigSchema,
  CallStepConfigSchema,
  LoadDatasetStepConfigSchema,
  BrowserStepConfigSchema,
]);

// --- TestStep ---

export const TestStepSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: StepType,
  config: z.record(z.any()), // validated per-type by executor
  order: z.number().int().min(0),
  continueOnFailure: z.boolean().default(false),
  retryCount: z.number().int().min(0).default(0),
});

export const CreateTestStepSchema = z.object({
  name: z.string().min(1),
  type: StepType,
  config: z.record(z.any()),
  order: z.number().int().min(0),
  continueOnFailure: z.boolean().default(false),
  retryCount: z.number().int().min(0).default(0),
});

// --- Types ---

export type HttpStepConfig = z.infer<typeof HttpStepConfigSchema>;
export type AssertionStepConfig = z.infer<typeof AssertionStepConfigSchema>;
export type ExtractStepConfig = z.infer<typeof ExtractStepConfigSchema>;
export type CallStepConfig = z.infer<typeof CallStepConfigSchema>;
export type LoadDatasetStepConfig = z.infer<typeof LoadDatasetStepConfigSchema>;
export type BrowserStepConfig = z.infer<typeof BrowserStepConfigSchema>;
export type BrowserAssertion = z.infer<typeof BrowserAssertionSchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type CreateTestStep = z.infer<typeof CreateTestStepSchema>;
