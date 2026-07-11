// ── email.step.ts ─────────────────────────────────────────────
import type { EmailConfig, WorkflowContext } from '../../../modules/workflows/workflows.types.js';

export async function executeEmailStep(config: EmailConfig, context: WorkflowContext): Promise<Record<string, unknown>> {
  const fill = (t: string) => t.replace(/\{\{([^}]+)\}\}/g, (_, p: string) =>
    String(p.trim().split('.').reduce((a: unknown, k) =>
      (a as Record<string, unknown>)?.[k], context) ?? ''));
  console.log(`[email] to=${config.to} subject="${fill(config.subject)}"`);
  // TODO: replace with SendGrid/Resend/Nodemailer
  return { emailSentTo: config.to, emailSubject: fill(config.subject) };
}