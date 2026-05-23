const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const LIMIT = 30; // 30 requests
const WINDOW_MS = 60 * 1000; // per 1 minute (60,000 ms)

export function getClientIp(req: Request): string {
  // Netlify specific header
  const clientIp = req.headers.get("client-ip");
  if (clientIp) return clientIp;

  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map(ip => ip.trim());
    // Get the last IP in the x-forwarded-for chain, which is the immediate client connecting to the router/balancer
    return ips[ips.length - 1] || "anonymous";
  }

  return "anonymous";
}

export async function isRateLimited(identifier: string): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Enforce Redis configuration in production
  if (process.env.NODE_ENV === 'production' && (!redisUrl || !redisToken)) {
    throw new Error("Critical: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production environment for rate limiting.");
  }

  if (redisUrl && redisToken) {
    try {
      const key = `ratelimit:${identifier}`;
      const cleanUrl = redisUrl.endsWith('/') ? redisUrl.slice(0, -1) : redisUrl;
      
      // Use standard Upstash Redis HTTP REST pipeline to INCR and EXPIRE in a single network roundtrip
      const response = await fetch(`${cleanUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, 60, 'NX'] // Set expiration only if the key has no TTL
        ]),
      });

      if (response.ok) {
        const results = await response.json();
        // results is an array of responses: [ { result: count }, { result: 1 } ]
        const count = results[0]?.result;
        if (typeof count === 'number' && count > LIMIT) {
          return true;
        }
        return false;
      }
    } catch (error) {
      console.warn("Upstash Redis connection failed. Falling back to in-memory rate limiting:", error);
    }
  }

  // In-memory fallback (local development / zero-config environment)
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return false;
  }

  if (now - record.lastReset > WINDOW_MS) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return false;
  }

  record.count += 1;
  if (record.count > LIMIT) {
    return true;
  }

  return false;
}

