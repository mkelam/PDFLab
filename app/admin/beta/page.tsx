"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Clock, Eye, Sparkles, ExternalLink } from "lucide-react"
import { api } from "@/lib/api"
import { AdminLayout } from "@/components/admin/AdminLayout"

interface BetaApplication {
  id: string
  full_name: string
  email: string
  company?: string
  role?: string
  use_case: string
  monthly_volume?: string
  plan_requested: "starter" | "pro"
  linkedin_url?: string
  twitter_url?: string
  website_url?: string
  status: "pending" | "approved" | "rejected"
  reviewed_at?: string
  created_at: string
}

export default function AdminBetaPage() {
  const [applications, setApplications] = useState<BetaApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<BetaApplication | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await api.get("/beta/applications")
      setApplications(response.applications)
    } catch (error) {
      console.error("Failed to fetch applications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this application? This will create a user account.")) {
      return
    }

    try {
      const response = await api.post(`/beta/applications/${id}/approve`, {})
      alert(`Application approved!\n\nEmail: ${response.credentials.email}\nPassword: ${response.credentials.password}\n\nMake sure to save these credentials!`)
      fetchApplications()
      setSelectedApplication(null)
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to approve application")
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason")
      return
    }

    if (!confirm("Are you sure you want to reject this application?")) {
      return
    }

    try {
      await api.post(`/beta/applications/${id}/reject`, { rejection_reason: rejectionReason })
      alert("Application rejected")
      fetchApplications()
      setSelectedApplication(null)
      setRejectionReason("")
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to reject application")
    }
  }

  const pendingApplications = applications.filter(app => app.status === "pending")
  const approvedApplications = applications.filter(app => app.status === "approved")
  const rejectedApplications = applications.filter(app => app.status === "rejected")

  const ApplicationCard = ({ application }: { application: BetaApplication }) => (
    <Card className="glass hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setSelectedApplication(application)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{application.full_name}</h3>
            <p className="text-sm text-muted-foreground">{application.email}</p>
          </div>
          <Badge variant={
            application.plan_requested === "pro" ? "default" : "secondary"
          }>
            {application.plan_requested}
          </Badge>
        </div>

        {application.company && (
          <p className="text-sm mb-2">
            <span className="text-muted-foreground">Company:</span> {application.company}
          </p>
        )}

        {application.role && (
          <p className="text-sm mb-2">
            <span className="text-muted-foreground">Role:</span> {application.role}
          </p>
        )}

        <p className="text-sm mb-3">
          <span className="text-muted-foreground">Volume:</span> {application.monthly_volume || "Not specified"}
        </p>

        <div className="text-sm text-muted-foreground line-clamp-2">
          {application.use_case}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {new Date(application.created_at).toLocaleDateString()}
          </span>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <Sparkles className="w-8 h-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold">Beta Applications</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved ({approvedApplications.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <XCircle className="w-4 h-4 mr-2" />
              Rejected ({rejectedApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : pendingApplications.length === 0 ? (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No pending applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingApplications.map(app => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {approvedApplications.length === 0 ? (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No approved applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedApplications.map(app => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedApplications.length === 0 ? (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No rejected applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedApplications.map(app => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Application Detail Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setSelectedApplication(null)}>
            <Card className="glass max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{selectedApplication.full_name}</CardTitle>
                    <p className="text-muted-foreground">{selectedApplication.email}</p>
                  </div>
                  <Badge variant={selectedApplication.status === "approved" ? "default" : selectedApplication.status === "rejected" ? "destructive" : "secondary"}>
                    {selectedApplication.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedApplication.company && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Company</p>
                      <p className="font-medium">{selectedApplication.company}</p>
                    </div>
                  )}
                  {selectedApplication.role && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Role</p>
                      <p className="font-medium">{selectedApplication.role}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Plan Requested</p>
                    <Badge variant={selectedApplication.plan_requested === "pro" ? "default" : "secondary"}>
                      {selectedApplication.plan_requested}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Monthly Volume</p>
                    <p className="font-medium">{selectedApplication.monthly_volume || "Not specified"}</p>
                  </div>
                </div>

                {/* Use Case */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Use Case</p>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedApplication.use_case}</p>
                  </div>
                </div>

                {/* Social Links */}
                {(selectedApplication.linkedin_url || selectedApplication.twitter_url || selectedApplication.website_url) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Links</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplication.linkedin_url && (
                        <a href={selectedApplication.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            LinkedIn <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      )}
                      {selectedApplication.twitter_url && (
                        <a href={selectedApplication.twitter_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            Twitter <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      )}
                      {selectedApplication.website_url && (
                        <a href={selectedApplication.website_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            Website <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions for Pending Applications */}
                {selectedApplication.status === "pending" && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Rejection Reason (required for rejection)
                      </label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide a reason if rejecting..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleApprove(selectedApplication.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Application
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedApplication.id)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Application
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border/30">
                  <Button variant="outline" onClick={() => setSelectedApplication(null)} className="w-full">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
