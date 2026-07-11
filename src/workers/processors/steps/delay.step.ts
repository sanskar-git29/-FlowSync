// ── delay.step.ts ─────────────────────────────────────────────
import type { DelayConfig } from '../../../modules/workflows/workflows.types.js';

export function executeDelayStep(config: DelayConfig): number {
  const min = 1_000;
  const max = 7 * 24 * 60 * 60 * 1_000;
  return Math.min(Math.max(config.milliseconds, min), max);
}