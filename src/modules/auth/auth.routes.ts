
import { Router } from 'express';
import { z }      from 'zod';
import * as ctrl  from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js'
import { validate }     from '../../middleware/validate.middleware.js';

const router = Router();

// ── Zod schemas — your first line of defense ────────────────
// These run BEFORE any controller code executes
const registerSchema = z.object({
  email:    z.string().email('Invalid email').max(255),
  // bcrypt silently truncates at 72 chars — enforce the limit explicitly
  password: z.string()
    .min(8,  'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
});

const loginSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

// ── Public routes (no JWT needed) ──────────────────────────
router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login',    validate(loginSchema),    ctrl.login);
router.post('/refresh',  validate(refreshSchema),  ctrl.refresh);

// ── Protected route (JWT required) ─────────────────────────
// authenticate runs first → if token invalid, request dies here
// ctrl.me only runs if authenticate calls next()
router.get('/me', authenticate, ctrl.me);

export default router;
