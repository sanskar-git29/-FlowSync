export interface WebhookConfig  { url: string; method: 'GET'|'POST'|'PUT'|'PATCH'; headers: Record<string,string> }
export interface DelayConfig    { milliseconds: number }
export interface ConditionConfig{ field: string; operator: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'contains'; value: unknown }
export interface EmailConfig    { to: string; subject: string; body: string }

export interface Workflow {
  id: string; userId: string; name: string;
  triggerEventType: string; isActive: boolean; createdAt: Date; updatedAt: Date;
}

export interface WorkflowStep {
  id: string; workflowId: string; position: number;
  type: 'webhook'|'delay'|'condition'|'email';
  config: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string; workflowId: string; eventId: string;
  status: 'pending'|'running'|'completed'|'failed';
  currentStep: number; context: Record<string, unknown>;
  error: string|null; startedAt: Date|null; completedAt: Date|null;
  createdAt: Date; updatedAt: Date;
}

export interface CreateWorkflowDto { name: string; triggerEventType: string }
export interface CreateStepDto { position: number; type: WorkflowStep['type']; config: Record<string, unknown> }
export type WorkflowContext = Record<string, unknown>