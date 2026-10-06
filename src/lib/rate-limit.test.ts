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

    for (const type of ['login', 'register', 'forgotPassword', 'resetPassword', 'resendVerification', 'changePassword', 'registerEmail', 'forgotPasswordEmail', 'resendVerificationEmail', 'twoFactor'] as const) {
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

describe('pickClientIp', () => {
  const from = (headers: Record<string, string>) => async () => {
    const { pickClientIp } = await loadRateLimit()
    return pickClientIp((name) => headers[name] ?? null)
  }

  it('trusts the platform headers first', async () => {
    expect(await from({ 'x-vercel-forwarded-for': '198.51.100.9', 'x-real-ip': '10.0.0.1', 'x-forwarded-for': '1.1.1.1' })()).toBe('198.51.100.9')
    expect(await from({ 'x-real-ip': '198.51.100.8', 'x-forwarded-for': '1.1.1.1' })()).toBe('198.51.100.8')
  })

  it("never uses the client-claimed first entry of x-forwarded-for", async () => {
    // A client can send "x-forwarded-for: 1.2.3.4"; a proxy appends the address it saw
    expect(await from({ 'x-forwarded-for': '1.2.3.4, 203.0.113.50' })()).toBe('203.0.113.50')
  })

  it('falls back to localhost with no header', async () => {
    expect(await from({})()).toBe('127.0.0.1')
  })
})

describe('checkRateLimit with no Redis in production', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('keeps a per-instance limit instead of switching limits off', async () => {
    const { checkRateLimit } = await loadRateLimit()

    // login allows 5 attempts per 15 minutes
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit('login', 'a@b.com')).success).toBe(true)
    }
    const blocked = await checkRateLimit('login', 'a@b.com')
    expect(blocked.success).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('counts each address separately', async () => {
    const { checkRateLimit } = await loadRateLimit()

    for (let i = 0; i < 5; i++) await checkRateLimit('login', 'a@b.com')
    expect((await checkRateLimit('login', 'a@b.com')).success).toBe(false)
    expect((await checkRateLimit('login', 'other@b.com')).success).toBe(true)
  })

  it('limits an address across IPs with ignoreIp', async () => {
    const { memoryLimit } = await loadRateLimit()

    for (let i = 0; i < 3; i++) expect(memoryLimit('registerEmail', 'victim@b.com').success).toBe(true)
    expect(memoryLimit('registerEmail', 'victim@b.com').success).toBe(false)
  })

  it('forgets attempts once the window has passed', async () => {
    const { memoryLimit } = await loadRateLimit()
    const start = Date.now()

    for (let i = 0; i < 3; i++) memoryLimit('registerEmail', 'late@b.com', start)
    expect(memoryLimit('registerEmail', 'late@b.com', start + 1000).success).toBe(false)
    expect(memoryLimit('registerEmail', 'late@b.com', start + 3_600_001).success).toBe(true)
  })

  it('warns once, not on every check', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { checkRateLimit } = await loadRateLimit()

    await checkRateLimit('ai', 'u1')
    await checkRateLimit('ai', 'u2')
    await checkRateLimit('create', 'u3')

    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('checkRateLimit key shape', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('keys a per-address limit by the address alone', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'some-token'
    limit.mockReset()
    limit.mockResolvedValue({ success: true, remaining: 2, reset: Date.now() + 1000 })
    const { checkRateLimit } = await loadRateLimit()

    await checkRateLimit('registerEmail', 'a@b.com', { ignoreIp: true })
    await checkRateLimit('login', 'a@b.com')

    expect(limit).toHaveBeenNthCalledWith(1, 'a@b.com')
    expect(limit).toHaveBeenNthCalledWith(2, '203.0.113.7:a@b.com')
  })
})
