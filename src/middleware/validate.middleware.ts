
import type { ZodSchema }from 'zod';
import type { Request, Response, NextFunction } from 'express';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Return ALL validation errors at once (not just the first)
      // This helps the client fix multiple issues in one round trip
      res.status(400).json({
        error:   'Validation failed',
        details: result.error.issues.map(e => ({
          field: e.path.join('.'),
          issue: e.message,
        })),    
      });
      return;
    }

    // IMPORTANT: replace raw body with parsed + sanitised data
    // Zod strips unknown fields and coerces types automatically
    req.body = result.data;
    next();
  };
}
