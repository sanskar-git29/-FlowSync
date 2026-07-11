import { pool } from '../../shared/db/pool.js';
import type { Workflow, WorkflowStep, WorkflowRun, CreateWorkflowDto, CreateStepDto } from './workflows.types.js';

export async function createWorkflow(userId: string, dto: CreateWorkflowDto): Promise<Workflow> {
  const r = await pool.query(
    `INSERT INTO workflows (user_id, name, trigger_event_type) VALUES ($1,$2,$3) RETURNING *`,
    [userId, dto.name, dto.triggerEventType],
  );
  return r.rows[0] as Workflow;
}

export async function getUserWorkflows(userId: string): Promise<Workflow[]> {
  const r = await pool.query('SELECT * FROM workflows WHERE user_id=$1 ORDER BY created_at DESC', [userId]);
  return r.rows as Workflow[];
}

export async function getWorkflowById(userId: string, workflowId: string): Promise<(Workflow & { steps: WorkflowStep[] }) | null> {
  const [wf, steps] = await Promise.all([
    pool.query('SELECT * FROM workflows WHERE id=$1 AND user_id=$2', [workflowId, userId]),
    pool.query('SELECT * FROM workflow_steps WHERE workflow_id=$1 ORDER BY position ASC', [workflowId]),
  ]);
  if (!wf.rows[0]) return null;
  return { ...(wf.rows[0] as Workflow), steps: steps.rows as WorkflowStep[] };
}

export async function deleteWorkflow(userId: string, workflowId: string): Promise<boolean> {
  const r = await pool.query('DELETE FROM workflows WHERE id=$1 AND user_id=$2', [workflowId, userId]);
  return (r.rowCount ?? 0) > 0;
}

export async function addStep(userId: string, workflowId: string, dto: CreateStepDto): Promise<WorkflowStep> {
  const owns = await pool.query('SELECT id FROM workflows WHERE id=$1 AND user_id=$2', [workflowId, userId]);
  if (!owns.rows[0]) throw new Error('WORKFLOW_NOT_FOUND');
  const r = await pool.query(
    `INSERT INTO workflow_steps (workflow_id, position, type, config) VALUES ($1,$2,$3,$4) RETURNING *`,
    [workflowId, dto.position, dto.type, JSON.stringify(dto.config)],
  );
  return r.rows[0] as WorkflowStep;
}

export async function getWorkflowRuns(userId: string, workflowId: string): Promise<WorkflowRun[]> {
  const r = await pool.query(
    `SELECT wr.* FROM workflow_runs wr JOIN workflows w ON w.id=wr.workflow_id WHERE wr.workflow_id=$1 AND w.user_id=$2 ORDER BY wr.created_at DESC`,
    [workflowId, userId],
  );
  return r.rows as WorkflowRun[];
}

// Called by event.processor.ts — finds active workflows for this user+eventType
export async function findTriggeredWorkflows(userId: string, eventType: string): Promise<Workflow[]> {
  const r = await pool.query(
    `SELECT * FROM workflows WHERE user_id=$1 AND trigger_event_type=$2 AND is_active=true`,
    [userId, eventType],
  );
  return r.rows as Workflow[];
}

export async function createWorkflowRun(workflowId: string, eventId: string, context: Record<string, unknown>): Promise<WorkflowRun> {
  const r = await pool.query(
    `INSERT INTO workflow_runs (workflow_id, event_id, context) VALUES ($1,$2,$3) RETURNING *`,
    [workflowId, eventId, JSON.stringify(context)],
  );
  return r.rows[0] as WorkflowRun;
}