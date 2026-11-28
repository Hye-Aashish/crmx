import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

const DEFAULT_DEV_SECRET = 'crmx-dev-only-insecure-secret';
const INSECURE_EXAMPLE_SECRET = 'crmx-super-secret-jwt-key-2026';

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!fromEnv || fromEnv === INSECURE_EXAMPLE_SECRET || fromEnv === DEFAULT_DEV_SECRET) {
      throw new Error(
        'JWT_SECRET must be set to a strong unique value in production. Do not use the example secret.'
      );
    }
    return fromEnv;
  }
  if (!fromEnv || fromEnv === INSECURE_EXAMPLE_SECRET) {
    console.warn(
      '⚠️  JWT_SECRET is missing or using the published example value. Set a strong JWT_SECRET in server/.env before deploying.'
    );
    return DEFAULT_DEV_SECRET;
  }
  return fromEnv;
}

const JWT_SECRET = resolveJwtSecret();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  // Keep payload minimal — role/permissions are always reloaded from DB on each request
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string };

    const dbUser = db
      .prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
      .get(decoded.id) as
      | { id: string; name: string; email: string; role: string; status?: string }
      | undefined;

    if (!dbUser) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    if (dbUser.status && dbUser.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Contact an administrator.' });
    }

    const perms = db
      .prepare('SELECT permission FROM role_permissions WHERE role_slug = ?')
      .all(dbUser.role) as { permission: string }[];

    req.user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      permissions: perms.map((p) => p.permission)
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
  };
}

export function requirePermission(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: Missing required permission '${requiredPermission}'.`
    });
  };
}

export function hasPermission(user: AuthUser | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return !!user.permissions?.includes(permission);
}

/** Users without view_all_leads are scoped to their own assigned records */
export function canViewAllLeads(user: AuthUser | undefined): boolean {
  return hasPermission(user, 'view_all_leads');
}
