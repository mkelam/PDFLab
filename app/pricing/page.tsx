"use client";
import { Navigation } from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Infinity, Shield, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

interface PlanFeatures {
  conversionsPerMonth: number;
  maxFileSize: number;
  ocrOverlayAccess: boolean;
  advancedFeatures: boolean;
  priorityProcessing: boolean;
  apiAccess: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  priceLabel?: string;
  currency: string;
  interval: string;
  features: PlanFeatures;
  description: string;
  icon: JSX.Element;
  buttonText: string;
  buttonVariant: "default" | "outline";
  popular: boolean;
}

// Static pricing plans - no API call needed!
const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    description: "Perfect for occasional PDF tasks",
    icon: <Zap className="w-6 h-6" />,
    buttonText: "Get Started",
    buttonVariant: "outline",
    popular: false,
    features: {
      conversionsPerMonth: 10,
      maxFileSize: 10485760, // 10MB
      ocrOverlayAccess: false,
      advancedFeatures: false,
      priorityProcessing: false,
      apiAccess: false,
    },
  },
  {
    id: "starter",
    name: "Starter",
    price: 4.55,
    originalPrice: 9.99,
    currency: "USD",
    interval: "month",
    description: "Ideal for professionals and small teams",
    icon: <Shield className="w-6 h-6" />,
    buttonText: "Choose Starter",
    buttonVariant: "default",
    popular: true,
    features: {
      conversionsPerMonth: 100,
      maxFileSize: 26214400, // 25MB
      ocrOverlayAccess: true,
      advancedFeatures: false,
      priorityProcessing: false,
      apiAccess: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 13.5,
    originalPrice: 29.99,
    currency: "USD",
    interval: "month",
    description: "Advanced features for power users",
    icon: <Infinity className="w-6 h-6" />,
    buttonText: "Choose Pro",
    buttonVariant: "outline",
    popular: false,
    features: {
      conversionsPerMonth: -1, // Unlimited
      maxFileSize: 104857600, // 100MB
      ocrOverlayAccess: true,
      advancedFeatures: true,
      priorityProcessing: true,
      apiAccess: false,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    priceLabel: "Custom",
    currency: "USD",
    interval: "month",
    description: "For large organizations with custom needs",
    icon: <Sparkles className="w-6 h-6" />,
    buttonText: "Contact Sales",
    buttonVariant: "outline",
    popular: false,
    features: {
      conversionsPerMonth: -1, // Unlimited
      maxFileSize: 524288000, // 500MB
      ocrOverlayAccess: true,
      advancedFeatures: true,
      priorityProcessing: true,
      apiAccess: true,
    },
  },
];

const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return `${mb}MB`;
};

const formatConversions = (count: number): string => {
  if (count === -1) return "Unlimited";
  return `${count} conversions`;
};

const getPlanFeaturesList = (plan: PricingPlan): string[] => {
  const features: string[] = [];

  features.push(
    `${formatConversions(plan.features.conversionsPerMonth)} per month`
  );

  if (plan.features.ocrOverlayAccess) {
    features.push("OCR-Enhanced PDF conversion");
  } else {
    features.push("Basic PDF-to-PowerPoint");
  }

  features.push(`${formatFileSize(plan.features.maxFileSize)} file size limit`);

  if (plan.features.priorityProcessing) {
    features.push("Priority processing");
  } else {
    features.push("Standard processing speed");
  }

  if (plan.features.advancedFeatures) {
    features.push("Advanced analytics");
    features.push("Batch processing");
    features.push("PDF merging");
  }

  if (plan.features.apiAccess) {
    features.push("API access");
    features.push("White-label options");
  }

  features.push(
    plan.features.priorityProcessing ? "Priority support" : "Email support"
  );

  return features;
};

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const formatPrice = (plan: PricingPlan): string => {
    if (plan.priceLabel) return plan.priceLabel;
    if (plan.price === 0) return "Free";
    return `$${plan.price}`;
  };

  const handlePlanSelection = async (planId: string) => {
    if (planId === "free") {
      window.location.href = "/signup";
      return;
    }

    if (planId === "enterprise") {
      // For Enterprise, open email client with pre-filled subject
      window.location.href =
        "mailto:support@pdflab.pro?subject=Enterprise%20Plan%20Inquiry%20-%20Custom%20Pricing&body=Hello,%0D%0A%0D%0AI'm%20interested%20in%20the%20Enterprise%20plan%20and%20would%20like%20to%20discuss%20custom%20pricing%20for%20my%20organization.%0D%0A%0D%0AOrganization%20Name:%20%0D%0ANumber%20of%20Users:%20%0D%0AEstimated%20Monthly%20Conversions:%20%0D%0A%0D%0AThank%20you!";
      return;
    }

    // For paid plans, redirect to get-started page
    window.location.href = `/get-started?plan=${planId}`;
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your PDF workflow with our powerful conversion tools.
              Start free and upgrade as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {PRICING_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`glass-strong border-border/50 relative transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/10 ${
                  plan.popular ? "ring-2 ring-primary/50" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      {plan.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    {plan.originalPrice && (
                      <div className="mb-2">
                        <span className="text-lg text-muted-foreground line-through">
                          ${plan.originalPrice}
                        </span>
                        <Badge className="ml-2 bg-green-500 text-white">
                          Save{" "}
                          {Math.round(
                            (1 - plan.price / plan.originalPrice) * 100
                          )}
                          %
                        </Badge>
                      </div>
                    )}
                    <div>
                      <span className="text-4xl font-bold text-foreground">
                        {formatPrice(plan)}
                      </span>
                      {plan.price > 0 && !plan.priceLabel && (
                        <span className="text-muted-foreground">
                          /{plan.interval}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {getPlanFeaturesList(plan).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    className={`w-full py-2.5 font-medium transition-all duration-200 ${
                      plan.buttonVariant === "default"
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
                        : "glass-subtle border-primary/50 text-primary hover:bg-primary/10"
                    }`}
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={isLoading !== null}
                  >
                    {isLoading === plan.id ? "Processing..." : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-8">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <Card className="glass-subtle border-border/40">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">
                    Can I change my plan anytime?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time.
                    Changes take effect immediately, and we'll prorate any
                    billing adjustments.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-subtle border-border/40">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">
                    Is there a free trial for paid plans?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, we offer a 14-day free trial for the Professional plan.
                    No credit card required to start.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-subtle border-border/40">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">
                    What file formats do you support?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We support all major document formats including PDF, Word,
                    Excel, PowerPoint, images (JPG, PNG, TIFF), and many more.
                    Professional and Enterprise plans include access to all
                    formats.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="text-center mt-16">
            <Card className="glass-strong border-border/50 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to get started?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Join thousands of professionals who trust PDF Lab Pro for
                  their document conversion needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                    onClick={() => handlePlanSelection("starter")}
                    disabled={isLoading !== null}
                  >
                    {isLoading === "starter"
                      ? "Processing..."
                      : "Choose Starter Plan"}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="glass-subtle border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                    onClick={() => handlePlanSelection("pro")}
                    disabled={isLoading !== null}
                  >
                    {isLoading === "pro" ? "Processing..." : "Choose Pro Plan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
