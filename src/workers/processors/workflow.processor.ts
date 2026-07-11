import type { Job } from 'bullmq';
import { pool }                 from '../../shared/db/pool.js';
import { enqueueWorkflowStep }  from '../../shared/queues/workflow.queue.js';
import { executeWebhookStep }   from './steps/webhook.step.js';
import { executeDelayStep }     from './steps/delay.step.js';
import { executeConditionStep } from './steps/condition.step.js';
import { executeEmailStep }     from './steps/email.step.js';
import type { WorkflowJobPayload, WorkflowJobName } from '../../shared/queues/queue.types.js';
import type { WorkflowStep, WebhookConfig, DelayConfig, ConditionConfig, EmailConfig }
  from '../../modules/workflows/workflows.types.js';

export async function processWorkflowStep(
  job: Job<WorkflowJobPayload, void, WorkflowJobName>,
): Promise<void> {
  const { workflowRunId, workflowId, eventId, userId, stepPosition, context } = job.data;
  console.log(`[workflow] run=${workflowRunId} step=${stepPosition}`);

  // Load the step at this position
  const stepRes = await pool.query<WorkflowStep>(
    'SELECT * FROM workflow_steps WHERE workflow_id=$1 AND position=$2',
    [workflowId, stepPosition],
  );

  // No more steps — workflow is done
  if (!stepRes.rows[0]) {
    await pool.query(
      'UPDATE workflow_runs SET status=$1, completed_at=NOW(), updated_at=NOW() WHERE id=$2',
      ['completed', workflowRunId],
    );
    console.log(`[workflow] run=${workflowRunId} ✓ all steps done`);
    return;
  }

  const step = stepRes.rows[0]!;

  // Create step run record
  const srRes = await pool.query(
    `INSERT INTO workflow_step_runs (workflow_run_id, step_id, position, status, input, started_at)
     VALUES ($1,$2,$3,'running',$4,NOW()) RETURNING id`,
    [workflowRunId, step.id, step.position, JSON.stringify(context)],
  );
  const stepRunId = (srRes.rows[0] as { id: string }).id;

  // Mark run as running
  await pool.query(
    'UPDATE workflow_runs SET status=$1, current_step=$2, started_at=COALESCE(started_at,NOW()), updated_at=NOW() WHERE id=$3',
    ['running', stepPosition, workflowRunId],
  );

  try {
    let output: Record<string, unknown> = {};
    let nextDelay = 0;
    const cfg = step.config as Record<string, unknown>;

    switch (step.type) {
      case 'webhook':
        output = await executeWebhookStep(cfg as  unknown as WebhookConfig, context);
        break;
      case 'delay':
        nextDelay = executeDelayStep(cfg as  unknown as DelayConfig);
        output = { delayedFor: nextDelay };
        break;
      case 'condition':
        output = { conditionResult: executeConditionStep(cfg as  unknown as ConditionConfig, context) };
        break;
      case 'email':
        output = await executeEmailStep(cfg as  unknown as EmailConfig, context);
        break;
      default:
        throw new Error(`Unknown step type: ${String(step.type)}`);
    }

    const updatedContext = { ...context, ...output };

    // Mark step completed + save output
    await pool.query(
      'UPDATE workflow_step_runs SET status=$1, output=$2, completed_at=NOW() WHERE id=$3',
      ['completed', JSON.stringify(output), stepRunId],
    );

    // Update context in DB
    await pool.query(
      'UPDATE workflow_runs SET context=$1, updated_at=NOW() WHERE id=$2',
      [JSON.stringify(updatedContext), workflowRunId],
    );

    // Enqueue next step (with delay if this was a delay step)
    await enqueueWorkflowStep(
      { workflowRunId, workflowId, eventId, userId, stepPosition: stepPosition + 1, context: updatedContext },
      nextDelay,
    );

    console.log(`[workflow] run=${workflowRunId} step=${stepPosition} ✓ ${step.type}`);

  } catch (err) {
    const error = (err as Error).message;
    await pool.query('UPDATE workflow_step_runs SET status=$1, error=$2, completed_at=NOW() WHERE id=$3', ['failed', error, stepRunId]);
    await pool.query('UPDATE workflow_runs SET status=$1, error=$2, updated_at=NOW() WHERE id=$3', ['failed', error, workflowRunId]);
    console.error(`[workflow] run=${workflowRunId} step=${stepPosition} ✗ ${error}`);
    throw err;
  }
}
