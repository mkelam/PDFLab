import { Suspense } from "react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import VerifyEmailClient from "./VerifyEmailClient"

// Force dynamic rendering to prevent static generation issues with useSearchParams
export const dynamic = 'force-dynamic'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-strong border-border/50 shadow-2xl w-full max-w-md">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Loading...</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">Please wait</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyEmailClient />
    </Suspense>
  )
}
