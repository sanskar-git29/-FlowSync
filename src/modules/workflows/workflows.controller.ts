import type { Request, Response, NextFunction } from 'express';
import * as svc from './workflows.service.js';
import type { CreateWorkflowDto, CreateStepDto } from './workflows.types.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json({ workflow: await svc.createWorkflow(req.user!.id, req.body as CreateWorkflowDto) }); }
  catch (e) { next(e); }
}
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ workflows: await svc.getUserWorkflows(req.user!.id) }); }
  catch (e) { next(e); }
}
export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const wf = await svc.getWorkflowById(req.user!.id, req.params['id']! as string);
    if (!wf) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ workflow: wf });
  } catch (e) { next(e); }
}
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await svc.deleteWorkflow(req.user!.id, req.params['id']! as string);
    if (!ok) { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (e) { next(e); }
}
export async function addStep(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.status(201).json({ step: await svc.addStep(req.user!.id, req.params['id']! as string, req.body as CreateStepDto) }); }
  catch (e) { next(e); }
}
export async function getRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ runs: await svc.getWorkflowRuns(req.user!.id, req.params['id']! as string) }); }
  catch (e) { next(e); }
}