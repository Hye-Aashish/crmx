import { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, suffix: string): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
    req.socket.remoteAddress ||
    'unknown';
  return `${ip}:${suffix}`;
}

/**
 * Simple in-memory sliding window rate limiter (per-process).
 * Good enough for single-node deployments without extra dependencies.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keySuffix: string;
  message?: string;
}) {
  const { windowMs, max, keySuffix, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req, keySuffix);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      return res.status(429).json({
        error: message || 'Too many requests. Please try again later.'
      });
    }

    next();
  };
}

// Periodic cleanup to avoid unbounded map growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref?.();
