import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

// Create Redis client (lazy initialization)
let redis: Redis | null = null
let warnedUnconfigured = false

/**
 * True when an env value is actually filled in. Values copied straight from
 * .env.example ("YOUR_...") count as unset.
 */
function isConfigured(value: string | undefined): value is string {
  return !!value && !value.startsWith('YOUR_')
}

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!isConfigured(url) || !isConfigured(token)) {
    // Once per process, not on every check
    if (!warnedUnconfigured) {
      warnedUnconfigured = true
      console.warn(
        process.env.NODE_ENV === 'production'
          ? 'Upstash Redis not configured - using the per-instance in-memory rate limiter'
          : 'Upstash Redis not configured - rate limiting disabled'
      )
    }
    return null
  }

  try {
    redis = new Redis({ url, token })
  } catch (error) {
    // e.g. a URL without https:// - keep the fallback behaviour
    console.error('Invalid Upstash Redis config - not using Redis for rate limiting:', error)
    return null
  }
  return redis
}

type Window = `${number} ${'s' | 'm' | 'h' | 'd'}`

const cfg = (limit: number, window: Window, prefix: string) => ({ limit, window, prefix })

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  // Login: 5 attempts per 15 minutes (keyed by IP + email)
  login: cfg(5, '15 m', 'ratelimit:login'),
  // Register: 3 attempts per hour (keyed by IP), and 3 per hour per address (see registerEmail)
  register: cfg(3, '1 h', 'ratelimit:register'),
  // Forgot password: 3 attempts per hour (keyed by IP)
  forgotPassword: cfg(3, '1 h', 'ratelimit:forgot-password'),
  // Reset password: 5 attempts per 15 minutes (keyed by IP)
  resetPassword: cfg(5, '15 m', 'ratelimit:reset-password'),
  // Resend verification: 3 attempts per 15 minutes (keyed by IP + email)
  resendVerification: cfg(3, '15 m', 'ratelimit:resend-verification'),
  // The same three mails, limited per address whatever the IP: a botnet rotating IPs can't
  // flood one person's inbox. (Keyed by the lowercased email alone.)
  registerEmail: cfg(3, '1 h', 'ratelimit:register-email'),
  forgotPasswordEmail: cfg(3, '1 h', 'ratelimit:forgot-password-email'),
  resendVerificationEmail: cfg(3, '1 h', 'ratelimit:resend-verification-email'),
  // Change password: 5 attempts per 15 minutes (keyed by IP + user ID)
  changePassword: cfg(5, '15 m', 'ratelimit:change-password'),
  // "Sign out everywhere": 5 per hour per user
  sessions: cfg(5, '1 h', 'ratelimit:sessions'),
  // Import: 5 imports per hour, and 20 previews, per user (parsing a big file is real work)
  import: cfg(5, '1 h', 'ratelimit:import'),
  importPreview: cfg(20, '1 h', 'ratelimit:import-preview'),
  // Search palette: 240 a minute per user (a request per pause in typing, a few per search)
  search: cfg(240, '1 m', 'ratelimit:search'),
  // Export: 10 per hour per user (a ZIP reads every file from storage)
  export: cfg(10, '1 h', 'ratelimit:export'),
  // Stripe: 10 checkouts and 20 portal sessions per hour per user
  checkout: cfg(10, '1 h', 'ratelimit:checkout'),
  portal: cfg(20, '1 h', 'ratelimit:portal'),
  // Creating items and collections from the app: 120 a minute per user, far more
  // than a person types, so a script or a runaway client is what hits it
  create: cfg(120, '1 m', 'ratelimit:create'),
  // File upload: 10 uploads per hour (keyed by user ID)
  upload: cfg(10, '1 h', 'ratelimit:upload'),
  // AI requests: 20 per hour (keyed by user ID)
  ai: cfg(20, '1 h', 'ratelimit:ai'),
  // Token API (browser extension): 60 requests per minute (keyed by user ID)
  api: cfg(60, '1 m', 'ratelimit:api'),
} as const

export type RateLimitType = keyof typeof rateLimitConfigs

/**
 * Limits that guard credentials. If Redis errors out they refuse the request
 * instead of waving it through: an outage must not switch off brute-force
 * protection. (Unset config still fails open in development, so local work
 * needs no Redis; in production it falls back to the in-memory limiter.)
 */
const FAIL_CLOSED: ReadonlySet<RateLimitType> = new Set([
  'login',
  'register',
  'forgotPassword',
  'resetPassword',
  'resendVerification',
  'registerEmail',
  'forgotPasswordEmail',
  'resendVerificationEmail',
  'changePassword',
])

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // Unix timestamp when the rate limit resets
  retryAfter: number // Seconds until can retry
}

const OPEN: RateLimitResult = { success: true, remaining: -1, reset: 0, retryAfter: 0 }

// ---------------------------------------------------------------------------
// In-memory fallback
//
// With no usable Redis in production (a missing or broken Upstash config), limits would silently
// vanish. This sliding-window log keeps a per-instance limit instead. It is weaker than Redis:
// every serverless instance counts separately and a cold start forgets, so an attacker gets some
// multiple of the limit, not unlimited tries. It exists so a misconfigured deploy is degraded,
// not wide open. Development and tests keep failing open.
// ---------------------------------------------------------------------------

const MAX_MEMORY_KEYS = 10_000
const memory = new Map<string, number[]>()

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const

function windowMs(window: Window): number {
  const [amount, unit] = window.split(' ')
  return Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS]
}

/** Counts one attempt for `key`. Exported for tests. */
export function memoryLimit(type: RateLimitType, key: string, now = Date.now()): RateLimitResult {
  const { limit, window } = rateLimitConfigs[type]
  const span = windowMs(window)
  const fullKey = `${type}:${key}`

  const recent = (memory.get(fullKey) ?? []).filter((t) => t > now - span)
  if (recent.length >= limit) {
    memory.set(fullKey, recent)
    const reset = recent[0] + span
    return { success: false, remaining: 0, reset, retryAfter: Math.max(1, Math.ceil((reset - now) / 1000)) }
  }

  recent.push(now)
  // Re-insert so the Map stays ordered by last use, then drop the least recently used keys
  memory.delete(fullKey)
  memory.set(fullKey, recent)
  if (memory.size > MAX_MEMORY_KEYS) {
    for (const oldest of memory.keys()) {
      memory.delete(oldest)
      if (memory.size <= MAX_MEMORY_KEYS) break
    }
  }
  return { success: true, remaining: limit - recent.length, reset: recent[0] + span, retryAfter: 0 }
}

// ---------------------------------------------------------------------------

/**
 * Pick the client IP from request headers, most trustworthy first. Vercel sets
 * `x-vercel-forwarded-for` and `x-real-ip` itself and overwrites any value the client sends. A
 * generic proxy appends to `x-forwarded-for`, so its last entry is the address that proxy saw;
 * the first entry is whatever the client claimed and is never used.
 */
export function pickClientIp(get: (name: string) => string | null | undefined): string {
  const vercel = get('x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0].trim()

  const realIP = get('x-real-ip')
  if (realIP) return realIP.trim()

  const forwardedFor = get('x-forwarded-for')
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((part) => part.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  // Development fallback
  return '127.0.0.1'
}

/**
 * Get the client IP address from headers
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers()
  return pickClientIp((name) => headersList.get(name))
}

/**
 * Check rate limit for a given type and identifier
 * @param type - The type of rate limit to check
 * @param identifier - Additional identifier (e.g., email) to combine with IP
 * @param options.ignoreIp - Key by the identifier alone, whatever the IP (a per-address limit)
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier?: string,
  options: { ignoreIp?: boolean } = {}
): Promise<RateLimitResult> {
  const redisClient = getRedis()
  const config = rateLimitConfigs[type]
  const ip = options.ignoreIp ? '' : await getClientIP()

  // Build the key: prefix:ip, prefix:ip:identifier, or prefix:identifier for a per-identifier limit
  const key = options.ignoreIp ? (identifier ?? '') : identifier ? `${ip}:${identifier}` : ip

  // No usable Redis: development fails open; production keeps a per-instance limit
  if (!redisClient) {
    return process.env.NODE_ENV === 'production' ? memoryLimit(type, key) : OPEN
  }

  try {
    const ratelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: config.prefix,
    })

    const result = await ratelimit.limit(key)

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    if (FAIL_CLOSED.has(type)) {
      // Ask the caller to retry in a minute
      return { success: false, remaining: 0, reset: Date.now() + 60_000, retryAfter: 60 }
    }
    // Fail open for everything else (AI, uploads, token API)
    return OPEN
  }
}

/**
 * Format retry time for user-friendly message
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(retryAfter: number) {
  const retryTime = formatRetryTime(retryAfter)
  return new Response(
    JSON.stringify({
      error: `Too many attempts. Please try again in ${retryTime}.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  )
}
