
// This extends Express's Request interface globally
// After this file exists, req.user is typed everywhere in your app

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// This export makes it a module (required for ambient declarations)
export {};
