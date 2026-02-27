import { Suspense } from 'react'
import { VerifyEmailContent } from '@/components/auth/verify-email-content'
import { AuthFallback } from '@/components/auth/auth-fallback'

export const metadata = {
  title: 'Verify email',
  description: 'Verify your BitBin email address',
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <Suspense fallback={<AuthFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
