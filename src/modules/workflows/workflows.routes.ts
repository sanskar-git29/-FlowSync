import { Router } from 'express';
import { z }      from 'zod';
import * as ctrl  from './workflows.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate }     from '../../middleware/validate.middleware.js';

const router = Router();
router.use(authenticate);

const wfSchema   = z.object({ name: z.string().min(1), triggerEventType: z.string().min(1) });
const stepSchema = z.object({
  position: z.number().int().min(1),
  type:     z.enum(['webhook','delay','condition','email']),
  config: z.record(z.string(), z.unknown()),
});

router.post('/',            validate(wfSchema),   ctrl.create);
router.get('/',             ctrl.list);
router.get('/:id',          ctrl.getOne);
router.delete('/:id',       ctrl.remove);
router.post('/:id/steps',   validate(stepSchema), ctrl.addStep);
router.get('/:id/runs',     ctrl.getRuns);

export default router;