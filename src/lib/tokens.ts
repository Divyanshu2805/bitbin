import { createHash, randomBytes } from 'crypto'
import { prisma } from './prisma'

/**
 * Email verification and password reset tokens.
 *
 * The raw token only ever exists in the email link. The database holds its
 * SHA-256, so someone who can read the `verification_tokens` table can't turn
 * a row into a working link. Tokens are single-use: consuming one deletes it
 * in the same statement that checks it exists, so two requests with the same
 * link can't both succeed.
 */

const TOKEN_EXPIRY_HOURS = 24
const PASSWORD_RESET_EXPIRY_HOURS = 1
const PASSWORD_RESET_PREFIX = 'password-reset:'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function newToken() {
  return randomBytes(32).toString('hex')
}

export async function generateVerificationToken(email: string) {
  const token = newToken()
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  })

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires,
    },
  })

  // The raw token goes into the email; only its hash is stored
  return token
}

/**
 * Use up an email verification link. Returns the email it was issued for, or
 * `null` if the token is unknown, already used, or expired (an expired one is
 * deleted). It can only succeed once per token.
 */
export async function consumeVerificationToken(token: string): Promise<{ email: string } | null> {
  const hashed = hashToken(token)
  const record = await prisma.verificationToken.findUnique({ where: { token: hashed } })

  // A password reset token must never verify an email, whatever its identifier looks like
  if (!record || record.identifier.startsWith(PASSWORD_RESET_PREFIX)) return null

  const { count } = await prisma.verificationToken.deleteMany({ where: { token: hashed } })
  if (count !== 1) return null // another request used it first

  if (new Date() > record.expires) return null
  return { email: record.identifier }
}

// Password Reset Token Functions
export async function generatePasswordResetToken(email: string) {
  const token = newToken()
  const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000)
  const identifier = `${PASSWORD_RESET_PREFIX}${email}`

  // Delete any existing password reset tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  })

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires,
    },
  })

  return token
}

/**
 * Use up a password reset link. Returns the email it was issued for, or `null`
 * if the token is unknown, already used, or expired. It can only succeed once
 * per token, even if the link is submitted twice at the same moment.
 */
export async function consumePasswordResetToken(token: string): Promise<{ email: string } | null> {
  const hashed = hashToken(token)
  const record = await prisma.verificationToken.findUnique({ where: { token: hashed } })

  if (!record || !record.identifier.startsWith(PASSWORD_RESET_PREFIX)) return null

  const { count } = await prisma.verificationToken.deleteMany({ where: { token: hashed } })
  if (count !== 1) return null // another request used it first

  if (new Date() > record.expires) return null
  return { email: record.identifier.slice(PASSWORD_RESET_PREFIX.length) }
}
