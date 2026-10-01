import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { limit } = vi.hoisted(() => ({ limit: vi.fn() }))

// Only the error tests below reach limit(); the others fail before a limiter is built
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {}
    }
    limit = limit
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '203.0.113.7']]),
}))

const ORIGINAL_ENV = { ...process.env }

// rate-limit.ts caches its Redis client, so load a fresh copy per test
async function loadRateLimit() {
  vi.resetModules()
  return import('./rate-limit')
}

describe('checkRateLimit without a usable Upstash config', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('fails open when the variables are unset', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const { checkRateLimit } = await loadRateLimit()

    await expect(checkRateLimit('login', 'a@b.com')).resolves.toMatchObject({
      success: true,
      remaining: -1,
    })
  })

  it('treats .env.example placeholders as unset', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'YOUR_UPSTASH_REDIS_REST_URL'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'YOUR_UPSTASH_REDIS_REST_TOKEN'
    const { checkRateLimit } = await loadRateLimit()

    await expect(checkRateLimit('register')).resolves.toMatchObject({
      success: true,
      remaining: -1,
    })
  })

  it('fails open instead of throwing on an invalid URL', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'not-a-url'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'some-token'
    const { checkRateLimit } = await loadRateLimit()

    await expect(checkRateLimit('upload', 'user_1')).resolves.toMatchObject({
      success: true,
      remaining: -1,
    })
  })
})

describe('checkRateLimit when Redis errors', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'some-token'
    limit.mockRejectedValue(new Error('network down'))
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('refuses credential endpoints instead of switching the limit off', async () => {
    const { checkRateLimit } = await loadRateLimit()

    for (const type of ['login', 'register', 'forgotPassword', 'resetPassword', 'resendVerification', 'changePassword'] as const) {
      await expect(checkRateLimit(type, 'a@b.com')).resolves.toMatchObject({ success: false, retryAfter: 60 })
    }
  })

  it('still fails open for AI, uploads and the token API', async () => {
    const { checkRateLimit } = await loadRateLimit()

    for (const type of ['ai', 'upload', 'api'] as const) {
      await expect(checkRateLimit(type, 'user_1')).resolves.toMatchObject({ success: true })
    }
  })
})
