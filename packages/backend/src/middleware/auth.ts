import { Request, Response, NextFunction } from 'express';
import { verifyToken, validateApiKey, getUser } from '../services/authService.js';

// Extend Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      userTier?: string;
    }
  }
}

// JWT auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Check if it's an API key
    if (token.startsWith('sk-ai-')) {
      const apiKeyData = validateApiKey(token);
      if (!apiKeyData) return res.status(401).json({ error: 'Invalid API key' });
      req.userId = apiKeyData.user_id;
      req.userRole = apiKeyData.role;
      req.userTier = apiKeyData.tier;
      return next();
    }

    // JWT token
    try {
      const decoded = verifyToken(token);
      const user = getUser(decoded.userId) as any;
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.userTier = user.tier;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
}

// Admin-only middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Optional auth - sets userId if token present, but doesn't block
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      if (token.startsWith('sk-ai-')) {
        const apiKeyData = validateApiKey(token);
        if (apiKeyData) {
          req.userId = apiKeyData.user_id;
          req.userRole = apiKeyData.role;
          req.userTier = apiKeyData.tier;
        }
      } else {
        const decoded = verifyToken(token);
        const user = getUser(decoded.userId) as any;
        if (user) {
          req.userId = decoded.userId;
          req.userRole = decoded.role;
          req.userTier = user.tier;
        }
      }
    } catch {}
  }
  next();
}
