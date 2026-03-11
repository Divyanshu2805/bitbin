import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
