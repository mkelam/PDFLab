import Link from 'next/link'
import { Home, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="glass-strong max-w-2xl w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-6">
            <TrendingUp className="w-24 h-24 text-primary opacity-50" />
          </div>
          <CardTitle className="text-6xl font-bold mb-4">404</CardTitle>
          <CardDescription className="text-xl">
            Partner Dashboard Not Found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            The partner dashboard you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="https://pdflab.pro/contact">
                Contact Support
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            Are you a partner? Make sure you're using the correct dashboard URL provided to you.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
