


// ── condition.step.ts ─────────────────────────────────────────
import type { ConditionConfig, WorkflowContext } from '../../../modules/workflows/workflows.types.js';

function getField(obj: WorkflowContext, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) =>
    (acc && typeof acc === 'object') ? (acc as Record<string, unknown>)[key] : undefined, obj);
}

export function executeConditionStep(config: ConditionConfig, context: WorkflowContext): boolean {
  const actual = getField(context, config.field);
  const target = config.value;
  switch (config.operator) {
    case 'eq':       return actual === target;
    case 'neq':      return actual !== target;
    case 'gt':       return Number(actual) > Number(target);
    case 'gte':      return Number(actual) >= Number(target);
    case 'lt':       return Number(actual) < Number(target);
    case 'lte':      return Number(actual) <= Number(target);
    case 'contains': return String(actual).includes(String(target));
    default: return false;
  }
}

