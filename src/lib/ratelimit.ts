import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL || 'https://dummy.upstash.io',
  token: process.env.KV_REST_API_TOKEN || 'dummy',
});

// Standard tier: 10 requests per 10 seconds (e.g., chat messaging)
export const standardRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Expensive tier: 5 requests per 60 seconds (e.g., AI vision analysis, RAG PDF ingestion)
export const expensiveRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
});

/**
 * Checks the rate limit for a specific key using the provided limiter.
 * Fails open (returns true) if Redis is not configured or throws an error.
 */
export async function checkRateLimit(key: string, limiter: Ratelimit): Promise<boolean> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return true; // Fail-open during local development
  }
  
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (error) {
    console.error('[RateLimit] Execution error (failing open):', error);
    return true; // Fail-open to prevent locking users out if Redis is down
  }
}
