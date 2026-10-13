'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthAccent, AuthAction, AuthBackLink, AuthHeader, AuthSwitch } from '@/components/auth/auth-ui'

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token'

export function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<VerificationStatus>(
    token ? 'loading' : 'no-token'
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return

    async function verifyEmail() {
      try {
        const response = await fetch(`/api/auth/verify?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage(data.message)
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed')
        }
      } catch {
        setStatus('error')
        setMessage('An unexpected error occurred')
      }
    }

    verifyEmail()
  }, [token])

  if (status === 'loading') {
    return (
      <div className="w-full space-y-7">
        <AuthHeader
          title={<>Checking your <AuthAccent>link.</AuthAccent></>}
          description={
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              One moment while we verify your email address.
            </span>
          }
        />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="w-full space-y-7">
        <AuthHeader title={<>You&apos;re <AuthAccent>verified.</AuthAccent></>} description={message} />
        <AuthAction href="/sign-in">Sign in to your account</AuthAction>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-full space-y-7">
        <AuthHeader
          title={<>That link <AuthAccent>didn&apos;t work.</AuthAccent></>}
          description={message}
        />
        <AuthAction href="/register" variant="secondary">Try registering again</AuthAction>
        <AuthSwitch>
          <AuthBackLink href="/sign-in">Back to sign in</AuthBackLink>
        </AuthSwitch>
      </div>
    )
  }

  return (
    <div className="w-full space-y-7">
      <AuthHeader
        title={<>Check your <AuthAccent>inbox.</AuthAccent></>}
        description="We've sent you a verification link. Open it to finish creating your account — check spam if it doesn't show up."
      />
      <AuthSwitch>
        <AuthBackLink href="/sign-in">Back to sign in</AuthBackLink>
      </AuthSwitch>
    </div>
  )
}
