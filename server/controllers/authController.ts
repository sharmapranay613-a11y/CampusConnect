import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { db } from '../services/db.js';

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { full_name, email, department, year, password } = req.body;

    if (!full_name || !email || !department || !year || !password) {
      res.status(400).json({ error: 'All fields are required: full_name, email, department, year, password.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    // Check if email already registered
    const existing = await db.getProfileByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    let userId: string | undefined;
    let token: string | undefined;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name, department, year },
          },
        });
        if (authError) {
          throw new Error(authError.message);
        }
        if (authData.user) {
          userId = authData.user.id;
          token = authData.session?.access_token || authData.user.id;
        }
      } catch (err: any) {
        console.warn('Supabase auth signup warning, continuing with local handler:', err.message);
      }
    }

    const profile = await db.createProfile({
      id: userId,
      full_name,
      email,
      department,
      year,
      password,
    });

    res.status(201).json({
      message: 'Account created successfully.',
      user: profile,
      token: token || profile.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
}

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    let profile = null;
    let token = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!authError && authData.user) {
          token = authData.session?.access_token || authData.user.id;
          profile = await db.getProfileById(authData.user.id);
        }
      } catch (e) {
        console.warn('Supabase signInWithPassword warning, falling back to local store:', e);
      }
    }

    if (!profile) {
      profile = await db.verifyPassword(email, password);
      if (!profile) {
        res.status(401).json({ error: 'Invalid college email or password.' });
        return;
      }
      token = profile.id;
    }

    res.json({
      message: 'Logged in successfully.',
      user: profile,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  res.json({ user: req.user });
}
