import type { Request, Response, NextFunction } from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { db } from '../services/db.js';
import type { Profile } from '../../src/types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: Profile;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Token not provided.' });
      return;
    }

    // Try Supabase auth verification if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && authData.user) {
          const profile = await db.getProfileById(authData.user.id);
          if (profile) {
            req.user = profile;
            next();
            return;
          }
        }
      } catch (e) {
        // Fall through to local session token validation
      }
    }

    // Check if token directly represents user id or session
    const profile = await db.getProfileById(token);
    if (profile) {
      req.user = profile;
      next();
      return;
    }

    res.status(401).json({ error: 'Unauthorized: Session invalid or expired. Please log in again.' });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Unauthorized.' });
  }
}
