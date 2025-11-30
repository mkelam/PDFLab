import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import AuthCallbackClient from "./AuthCallbackClient"

// Force dynamic rendering to prevent static generation issues with useSearchParams
export const dynamic = 'force-dynamic'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackClient />
    </Suspense>
  )
}
