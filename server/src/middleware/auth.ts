import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'crmx-super-secret-jwt-key-2026';

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
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Fetch fresh permissions for user role
    const perms = db.prepare('SELECT permission FROM role_permissions WHERE role_slug = ?').all(decoded.role) as { permission: string }[];
    decoded.permissions = perms.map(p => p.permission);

    req.user = decoded;
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
    // Super-admin always bypasses role checks
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
    return res.status(403).json({ error: `Forbidden: Missing required permission '${requiredPermission}'.` });
  };
}
