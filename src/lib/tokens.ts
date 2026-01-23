import { randomBytes } from 'crypto'
import { prisma } from './prisma'

const TOKEN_EXPIRY_HOURS = 24
const PASSWORD_RESET_EXPIRY_HOURS = 1
const PASSWORD_RESET_PREFIX = 'password-reset:'

export async function generateVerificationToken(email: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  })

  // Create new token
  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  })

  return verificationToken.token
}

export async function getVerificationToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  return verificationToken
}

export async function deleteVerificationToken(token: string) {
  await prisma.verificationToken.delete({
    where: { token },
  })
}

// Password Reset Token Functions
export async function generatePasswordResetToken(email: string) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000)
  const identifier = `${PASSWORD_RESET_PREFIX}${email}`

  // Delete any existing password reset tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier },
  })

  // Create new token
  const resetToken = await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  })

  return resetToken.token
}

export async function getPasswordResetToken(token: string) {
  const resetToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  // Verify it's a password reset token (has the prefix)
  if (!resetToken || !resetToken.identifier.startsWith(PASSWORD_RESET_PREFIX)) {
    return null
  }

  return {
    ...resetToken,
    email: resetToken.identifier.replace(PASSWORD_RESET_PREFIX, ''),
  }
}

export async function deletePasswordResetToken(token: string) {
  await prisma.verificationToken.delete({
    where: { token },
  })
}
