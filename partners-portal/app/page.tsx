import Link from 'next/link'
import { TrendingUp, DollarSign, Users, BarChart3, Award, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-6xl md:text-7xl font-bold">
            <span className="text-gradient-primary">PDFLab</span>
            <span className="text-foreground"> Partners</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Turn your audience into recurring income. Earn up to <span className="text-primary font-semibold">50% commission</span> on every referral.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link href="/apply">
                Become a Partner
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link href="https://pdflab.pro">
                View Main Site
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Why Partner With Us?</h2>
          <p className="text-xl text-muted-foreground">Everything you need to succeed as a PDFLab partner</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="glass-strong">
            <CardHeader>
              <DollarSign className="w-12 h-12 text-primary mb-4" />
              <CardTitle>High Commissions</CardTitle>
              <CardDescription>30-50% recurring revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Earn up to 50% commission on every subscription. Tier up as you grow and unlock higher rates.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Real-Time Analytics</CardTitle>
              <CardDescription>Track every conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                See signups, conversions, and earnings in real-time. Full transparency with detailed reports.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <Users className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Dedicated Dashboard</CardTitle>
              <CardDescription>Manage everything in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your personalized dashboard with referral links, promo codes, and performance metrics.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <Award className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Tier System</CardTitle>
              <CardDescription>Grow your commission rate</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Start at 30% and climb to 50%. Bronze → Silver → Gold → Platinum tiers reward your growth.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Earning Calculator</CardTitle>
              <CardDescription>Model your potential income</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Interactive calculator shows exactly how much you can earn based on your audience size.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader>
              <Zap className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Fast Payouts</CardTitle>
              <CardDescription>Monthly payments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get paid monthly via your preferred method. Low minimum threshold for quick cashouts.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Commission Tiers */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Commission Tiers</h2>
          <p className="text-xl text-muted-foreground">The more you refer, the more you earn</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="glass-strong border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-orange-500">🥉</span>
                Bronze
              </CardTitle>
              <CardDescription>0-200 conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary mb-2">30%</p>
              <p className="text-sm text-muted-foreground">Commission rate</p>
            </CardContent>
          </Card>

          <Card className="glass-strong border-l-4 border-l-gray-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-gray-400">🥈</span>
                Silver
              </CardTitle>
              <CardDescription>200-500 conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary mb-2">40%</p>
              <p className="text-sm text-muted-foreground">Commission rate</p>
            </CardContent>
          </Card>

          <Card className="glass-strong border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-yellow-500">🥇</span>
                Gold
              </CardTitle>
              <CardDescription>500-1000 conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary mb-2">50%</p>
              <p className="text-sm text-muted-foreground">Commission rate</p>
            </CardContent>
          </Card>

          <Card className="glass-strong border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-purple-500">💎</span>
                Platinum
              </CardTitle>
              <CardDescription>1000+ conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary mb-2">50%</p>
              <p className="text-sm text-muted-foreground">+ Premium support</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="glass-strong max-w-4xl mx-auto text-center p-8">
          <CardHeader>
            <CardTitle className="text-4xl font-bold mb-4">Ready to Get Started?</CardTitle>
            <CardDescription className="text-lg">
              Join hundreds of influencers earning recurring income with PDFLab
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Apply now and get your personalized dashboard, referral links, and start earning within 24 hours.
            </p>
            <Button size="lg" className="text-lg px-12" asChild>
              <Link href="/apply">
                Apply to Become a Partner
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Already a partner? Access your dashboard using your unique link.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
