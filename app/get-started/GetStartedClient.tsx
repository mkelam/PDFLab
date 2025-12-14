"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, ArrowLeft, AlertCircle, Loader2, Check, Shield, Infinity, Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import AuthAPI from "@/lib/auth-api"

interface PlanDetails {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  icon: JSX.Element
  features: string[]
}

const PLAN_DETAILS: Record<string, PlanDetails> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 4.55,
    currency: "USD",
    interval: "month",
    icon: <Shield className="w-6 h-6" />,
    features: [
      "100 conversions per month",
      "25MB file size limit",
      "OCR-Enhanced PDF conversion",
      "Email support"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 13.50,
    currency: "USD",
    interval: "month",
    icon: <Infinity className="w-6 h-6" />,
    features: [
      "Unlimited conversions",
      "100MB file size limit",
      "OCR-Enhanced conversion",
      "Advanced analytics",
      "Priority processing",
      "Priority support"
    ]
  }
}

export default function GetStartedClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, login, signup } = useAuth()
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const planId = searchParams?.get("plan") || "starter"
  const plan = PLAN_DETAILS[planId]

  // If user is already logged in, redirect to payment
  useEffect(() => {
    if (user) {
      router.push(`/payment?plan=${planId}`)
    }
  }, [user, planId, router])

  // Signup form state
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  })

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validation
      if (!signupData.firstName || !signupData.lastName || !signupData.email || !signupData.password) {
        throw new Error("Please fill in all fields")
      }

      if (!AuthAPI.validateEmail(signupData.email)) {
        throw new Error("Please enter a valid email address")
      }

      if (signupData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long")
      }

      if (signupData.password !== signupData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (!signupData.acceptTerms) {
        throw new Error("Please accept the Terms of Service and Privacy Policy")
      }

      // Sign up
      await signup({
        email: signupData.email,
        password: signupData.password,
        firstName: signupData.firstName,
        lastName: signupData.lastName
      })

      // After successful signup, redirect to payment
      router.push(`/payment?plan=${planId}`)
    } catch (error) {
      console.error("Signup error:", error)
      setError(error instanceof Error ? error.message : "Signup failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (!loginData.email || !loginData.password) {
        throw new Error("Please enter both email and password")
      }

      if (!AuthAPI.validateEmail(loginData.email)) {
        throw new Error("Please enter a valid email address")
      }

      await login({
        email: loginData.email,
        password: loginData.password
      })

      // After successful login, redirect to payment
      router.push(`/payment?plan=${planId}`)
    } catch (error) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-strong border-border/50 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Plan</h2>
            <p className="text-muted-foreground mb-4">The selected plan doesn't exist.</p>
            <Button onClick={() => router.push("/pricing")}>View Pricing Plans</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[2fr,1fr] gap-8">
        {/* Auth Forms */}
        <div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Pricing
          </Link>

          <Card className="glass-strong border-border/50">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground">Get Started</CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign up or log in to continue with your purchase
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signup" | "login")}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="login">Log In</TabsTrigger>
                </TabsList>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Sign Up Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={signupData.firstName}
                          onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                          className="glass-subtle bg-input/50 border-border/40"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={signupData.lastName}
                          onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                          className="glass-subtle bg-input/50 border-border/40"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className="glass-subtle bg-input/50 border-border/40"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          className="glass-subtle bg-input/50 border-border/40 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        className="glass-subtle bg-input/50 border-border/40"
                        required
                      />
                    </div>

                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={signupData.acceptTerms}
                        onChange={(e) => setSignupData({ ...signupData, acceptTerms: e.target.checked })}
                        className="mt-1"
                        required
                      />
                      <label htmlFor="acceptTerms" className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Continue to Payment"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Log In Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="glass-subtle bg-input/50 border-border/40"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="glass-subtle bg-input/50 border-border/40"
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging In...
                        </>
                      ) : (
                        "Continue to Payment"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Plan Summary Sidebar */}
        <div>
          <Card className="glass-strong border-primary/20 sticky top-8">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">Your Plan</CardTitle>
                <Badge className="bg-primary/10 text-primary">Selected</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  {plan.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ${plan.price}/{plan.interval}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <p className="text-sm font-medium mb-3">Included features:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-border/40">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Monthly Total</span>
                  <span className="text-2xl font-bold">${plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">Billed monthly, cancel anytime</p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              After {activeTab === "signup" ? "signing up" : "logging in"}, you'll be securely redirected to complete your payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
