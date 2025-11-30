"use client";

import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function BetaApplicationClient() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    company: "",
    role: "",
    use_case: "",
    monthly_volume: "1-10",
    plan_requested: "starter",
    linkedin_url: "",
    twitter_url: "",
    website_url: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await api.post("/beta/apply", formData);
      setSubmitStatus("success");
      setFormData({
        full_name: "",
        email: "",
        company: "",
        role: "",
        use_case: "",
        monthly_volume: "1-10",
        plan_requested: "starter",
        linkedin_url: "",
        twitter_url: "",
        website_url: "",
      });
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to submit application. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitStatus === "success") {
    return (
      <div className="min-h-screen">
        <Navigation />
        <section className="pt-32 pb-12 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="glass">
              <CardContent className="p-12">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-4">
                  Application Submitted!
                </h1>
                <p className="text-muted-foreground mb-8">
                  Thank you for your interest in PDFLab Beta. We've received
                  your application and will review it within 48 hours. You'll
                  receive an email once your application is processed.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/">
                    <Button variant="outline">Back to Home</Button>
                  </Link>
                  <Link href="/features">
                    <Button>Explore Features</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary mr-2" />
              <h1 className="font-bold text-4xl md:text-5xl">
                The Founder's 100
              </h1>
            </div>

            {/* License Drop Banner */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-medium text-primary">
                Live Drop Status:{" "}
                <span className="font-bold text-red-500">
                  CRITICAL (Few Seats Left)
                </span>
              </span>
            </div>

            <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-4">
              To guarantee zero-latency performance, we are releasing these{" "}
              <strong>100 Lifetime Spots</strong> in strict batches of{" "}
              <strong>10 per week</strong>.
            </p>

            <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 max-w-xl mx-auto text-sm">
              <p className="font-bold text-white mb-1">⚠️ Fair Warning</p>
              <p className="text-gray-300">
                Once these 100 spots are filled, PDFLab will transition to a
                strictly paid subscription model ($29/mo).{" "}
                <strong className="text-white">
                  Secure your legacy rate ($0/forever) now.
                </strong>
              </p>
            </div>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Beta Application</CardTitle>
              <CardDescription>
                Tell us about yourself and how you plan to use PDFLab. We're
                looking for active users who can provide feedback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Personal Information
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Acme Inc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="role">Role (Optional)</Label>
                      <Input
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        placeholder="Product Manager"
                      />
                    </div>
                  </div>
                </div>

                {/* Use Case */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    How Will You Use PDFLab?
                  </h3>

                  <div>
                    <Label htmlFor="use_case">Use Case *</Label>
                    <Textarea
                      id="use_case"
                      name="use_case"
                      value={formData.use_case}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Describe how you plan to use PDFLab. What problems are you trying to solve? What features are most important to you?"
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Be specific - this helps us understand your needs better.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="monthly_volume">
                      Expected Monthly Usage
                    </Label>
                    <RadioGroup
                      value={formData.monthly_volume}
                      onValueChange={(value) =>
                        setFormData({ ...formData, monthly_volume: value })
                      }
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1-10" id="volume-1" />
                        <Label
                          htmlFor="volume-1"
                          className="font-normal cursor-pointer"
                        >
                          1-10 files/month
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="10-50" id="volume-2" />
                        <Label
                          htmlFor="volume-2"
                          className="font-normal cursor-pointer"
                        >
                          10-50 files/month
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="50-100" id="volume-3" />
                        <Label
                          htmlFor="volume-3"
                          className="font-normal cursor-pointer"
                        >
                          50-100 files/month
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="100+" id="volume-4" />
                        <Label
                          htmlFor="volume-4"
                          className="font-normal cursor-pointer"
                        >
                          100+ files/month
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Plan Preference (you will not be charged)
                  </h3>

                  <RadioGroup
                    value={formData.plan_requested}
                    onValueChange={(value) =>
                      setFormData({ ...formData, plan_requested: value })
                    }
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        formData.plan_requested === "starter"
                          ? "border-primary"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4 flex items-start">
                        <RadioGroupItem
                          value="starter"
                          id="plan-starter"
                          className="mt-1"
                        />
                        <div className="ml-3">
                          <Label
                            htmlFor="plan-starter"
                            className="font-semibold cursor-pointer"
                          >
                            Starter Plan (Worth $9.99/mo)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            100 files/month, 25MB file size, all formats
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all ${
                        formData.plan_requested === "pro"
                          ? "border-primary"
                          : ""
                      }`}
                    >
                      <CardContent className="p-4 flex items-start">
                        <RadioGroupItem
                          value="pro"
                          id="plan-pro"
                          className="mt-1"
                        />
                        <div className="ml-3">
                          <Label
                            htmlFor="plan-pro"
                            className="font-semibold cursor-pointer"
                          >
                            Pro Plan (Worth $29.99/mo)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Unlimited files, 100MB file size, priority support
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </RadioGroup>
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Connect With Us (Optional)
                  </h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="linkedin_url">LinkedIn</Label>
                      <Input
                        id="linkedin_url"
                        name="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={handleChange}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="twitter_url">Twitter/X</Label>
                      <Input
                        id="twitter_url"
                        name="twitter_url"
                        value={formData.twitter_url}
                        onChange={handleChange}
                        placeholder="https://twitter.com/..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="website_url">Website</Label>
                      <Input
                        id="website_url"
                        name="website_url"
                        value={formData.website_url}
                        onChange={handleChange}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {submitStatus === "error" && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    By submitting, you agree to our Terms of Service and Privacy
                    Policy.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
