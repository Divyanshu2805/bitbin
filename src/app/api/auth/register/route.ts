import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { MAX_PASSWORD_LENGTH } from '@/lib/validation';

const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The same answer for a new address and one that's already registered, so this
// endpoint can't be used to find out who has an account
const CHECK_EMAIL = {
  success: true,
  message: 'Please check your email to verify your account',
};

export async function POST(request: Request) {
  try {
    // Check rate limit (3 attempts per hour by IP)
    const rateLimit = await checkRateLimit('register');
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    // Validate required fields
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof confirmPassword !== 'string' ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        { error: 'Email, password, and confirm password are required' },
        { status: 400 },
      );
    }

    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (name !== undefined && name !== null && (typeof name !== 'string' || name.length > MAX_NAME_LENGTH)) {
      return NextResponse.json(
        { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    // Check if email verification should be skipped (development only)
    const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (skipVerification) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 },
        );
      }

      // A verified account, or one that signs in with GitHub, can't be claimed
      // by registering again. Say nothing and send nothing.
      if (existingUser.emailVerified || !existingUser.password) {
        return NextResponse.json(CHECK_EMAIL, { status: 201 });
      }

      // An unverified password account: whoever registers last, with access to
      // the mailbox, owns it. A password set by someone who never could verify
      // the address (a pre-registration squat) is replaced, not kept.
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || null,
          password: await bcrypt.hash(password, 12),
        },
      });
      const token = await generateVerificationToken(email);
      await sendVerificationEmail(email, token);
      return NextResponse.json(CHECK_EMAIL, { status: 201 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (emailVerified is set if skipping verification)
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        emailVerified: skipVerification ? new Date() : null,
      },
    });

    // Generate verification token and send email (unless skipped)
    if (!skipVerification) {
      try {
        const token = await generateVerificationToken(email);
        await sendVerificationEmail(email, token);
      } catch (error) {
        // Don't leave an account the user can't verify and can't re-register
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        throw error;
      }
    }

    return NextResponse.json(
      skipVerification
        ? { success: true, message: 'Account created successfully' }
        : CHECK_EMAIL,
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 },
    );
  }
}
