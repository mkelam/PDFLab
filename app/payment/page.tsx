import { Suspense } from "react"
import PaymentClient from "./PaymentClient"

// Force dynamic rendering to prevent static generation issues with useSearchParams
export const dynamic = 'force-dynamic'

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    }>
      <PaymentClient />
    </Suspense>
  )
}
