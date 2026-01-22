import { Suspense } from 'react'
import { PaymentReturnContent } from './payment-return-client'

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  )
}
