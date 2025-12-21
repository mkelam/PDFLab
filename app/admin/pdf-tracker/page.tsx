'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  RefreshCw,
  Play,
  Settings,
  FileText,
  AlertTriangle,
  MessageSquare,
  Plus,
  X,
  ExternalLink,
  TrendingUp,
  Eye,
  Calendar
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

interface TrackerConfig {
  subreddits: string[]
  pdf_keywords: string[]
  complaint_keywords: string[]
  viral_threshold: number
}

interface TrackerStats {
  total_posts_scanned: number
  pdf_posts_found: number
  complaints_found: number
  comments_with_pdf: number
  comments_with_complaints: number
}

interface Comment {
  body: string
  score: number
  is_complaint: boolean
  complaint_keywords: string[]
}

interface Post {
  title: string
  url: string
  score: number
  num_comments: number
  content_preview: string
  pdf_keywords: string[]
  is_complaint: boolean
  complaint_keywords: string[]
  comments: Comment[]
}

interface SubredditResult {
  name: string
  posts: Post[]
  error: string | null
}

interface Report {
  date: string
  generated: string
  subreddits_monitored: string[]
  viral_threshold: number
  stats: TrackerStats
  subreddit_results: SubredditResult[]
}

interface DashboardStats {
  totalReports: number
  subredditsMonitored: number
  pdfKeywords: number
  complaintKeywords: number
  viralThreshold: number
  latestReport: {
    date: string
    generated: string
    totalPostsScanned: number
    pdfPostsFound: number
    complaintsFound: number
  } | null
}

export default function PDFTrackerPage() {
  const [config, setConfig] = useState<TrackerConfig | null>(null)
  const [results, setResults] = useState<{ reports: Report[] }>({ reports: [] })
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'results' | 'config'>('results')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [newItem, setNewItem] = useState({ category: '', value: '' })

  const getAuthToken = () => localStorage.getItem('authToken')

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/config`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })
      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }

  const fetchResults = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/results`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })
      if (response.ok) {
        const data = await response.json()
        setResults(data)
        if (data.reports.length > 0 && !selectedReport) {
          setSelectedReport(data.reports[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/stats`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const runTracker = async () => {
    try {
      setRunning(true)
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await fetchResults()
          await fetchStats()
          alert('Tracker completed successfully!')
        } else {
          alert('Tracker failed: ' + (data.error || 'Unknown error'))
        }
      } else {
        const error = await response.json()
        alert('Failed to run tracker: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to run tracker:', error)
      alert('Failed to run tracker')
    } finally {
      setRunning(false)
    }
  }

  const addConfigItem = async (category: string, value: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/config/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category, value })
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
        setNewItem({ category: '', value: '' })
      }
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  const removeConfigItem = async (category: string, value: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/config/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category, value })
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  const updateThreshold = async (threshold: number) => {
    if (!config) return
    try {
      const response = await fetch(`${API_URL}/api/admin/pdf-tracker/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...config, viral_threshold: threshold })
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to update threshold:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchConfig(), fetchResults(), fetchStats()])
      setLoading(false)
    }
    loadData()
  }, [])

  const renderConfigSection = (
    title: string,
    items: string[],
    category: 'subreddits' | 'pdf_keywords' | 'complaint_keywords',
    placeholder: string
  ) => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="px-3 py-1.5 flex items-center gap-2"
          >
            {category === 'subreddits' ? `r/${item}` : item}
            <button
              onClick={() => removeConfigItem(category, item)}
              className="hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newItem.category === category ? newItem.value : ''}
          onChange={(e) => setNewItem({ category, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.value.trim()) {
              addConfigItem(category, newItem.value.trim())
            }
          }}
          className="max-w-xs"
        />
        <Button
          size="sm"
          onClick={() => {
            if (newItem.value.trim() && newItem.category === category) {
              addConfigItem(category, newItem.value.trim())
            }
          }}
          disabled={!newItem.value.trim() || newItem.category !== category}
        >
          <Plus size={16} className="mr-1" />
          Add
        </Button>
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Search className="w-8 h-8 text-primary" />
              PDF Tracker
            </h1>
            <p className="text-muted-foreground">Monitor Reddit for viral PDF-related discussions and complaints</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchConfig()
                fetchResults()
                fetchStats()
              }}
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button
              onClick={runTracker}
              disabled={running}
              className="bg-primary hover:bg-primary/90"
            >
              {running ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Run Tracker
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats.subredditsMonitored}</div>
              <div className="text-sm text-muted-foreground">Subreddits</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats.pdfKeywords}</div>
              <div className="text-sm text-muted-foreground">PDF Keywords</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.latestReport?.pdfPostsFound || 0}</div>
              <div className="text-sm text-muted-foreground">Posts Found</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{stats.latestReport?.complaintsFound || 0}</div>
              <div className="text-sm text-muted-foreground">Complaints</div>
            </CardContent>
          </Card>
          <Card className="glass-strong border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats.totalReports}</div>
              <div className="text-sm text-muted-foreground">Total Reports</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'results' ? 'default' : 'outline'}
          onClick={() => setActiveTab('results')}
        >
          <FileText size={16} className="mr-2" />
          Results
        </Button>
        <Button
          variant={activeTab === 'config' ? 'default' : 'outline'}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={16} className="mr-2" />
          Configuration
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : activeTab === 'config' ? (
        <Card className="glass-strong border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Tracker Configuration
            </CardTitle>
            <CardDescription>Configure which subreddits and keywords to monitor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {config && (
              <>
                {renderConfigSection(
                  'Subreddits to Monitor',
                  config.subreddits,
                  'subreddits',
                  'Enter subreddit name (without r/)'
                )}

                {renderConfigSection(
                  'PDF Keywords',
                  config.pdf_keywords,
                  'pdf_keywords',
                  'Enter PDF-related keyword'
                )}

                {renderConfigSection(
                  'Complaint Keywords',
                  config.complaint_keywords,
                  'complaint_keywords',
                  'Enter complaint keyword'
                )}

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">Viral Threshold</h3>
                  <p className="text-sm text-muted-foreground">Minimum upvotes for a post to be considered viral</p>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={config.viral_threshold}
                      onChange={(e) => updateThreshold(parseInt(e.target.value) || 1)}
                      className="w-24"
                      min={1}
                    />
                    <span className="text-muted-foreground">upvotes</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Report List */}
          <div className="col-span-3">
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {results.reports.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No reports yet. Run the tracker to generate a report.
                    </div>
                  ) : (
                    results.reports.map((report) => (
                      <button
                        key={report.date}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full p-4 text-left border-b border-border/50 hover:bg-white/5 transition ${
                          selectedReport?.date === report.date ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-foreground">{report.date}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {report.stats.pdf_posts_found} posts, {report.stats.complaints_found} complaints
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Detail */}
          <div className="col-span-9">
            {selectedReport ? (
              <Card className="glass-strong border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Report: {selectedReport.date}
                      </CardTitle>
                      <CardDescription>Generated at {selectedReport.generated}</CardDescription>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedReport.stats.total_posts_scanned} scanned</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span>{selectedReport.stats.pdf_posts_found} found</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span>{selectedReport.stats.complaints_found} complaints</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                    {selectedReport.subreddit_results.map((subreddit) => (
                      <div key={subreddit.name}>
                        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className="text-primary">r/{subreddit.name}</span>
                          <Badge variant="secondary">{subreddit.posts.length} posts</Badge>
                        </h3>

                        {subreddit.error ? (
                          <p className="text-red-500 text-sm">{subreddit.error}</p>
                        ) : subreddit.posts.length === 0 ? (
                          <p className="text-muted-foreground text-sm italic">No PDF-related viral posts found</p>
                        ) : (
                          <div className="space-y-4">
                            {subreddit.posts.map((post, idx) => (
                              <div
                                key={idx}
                                className={`p-4 rounded-lg border ${
                                  post.is_complaint
                                    ? 'border-red-500/30 bg-red-500/5'
                                    : 'border-border/50 bg-white/5'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-foreground font-medium hover:text-primary transition flex items-center gap-2"
                                    >
                                      {post.title}
                                      <ExternalLink size={14} />
                                    </a>
                                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                                      {post.content_preview}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <div className="flex items-center gap-1 text-primary">
                                      <TrendingUp size={14} />
                                      {post.score}
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <MessageSquare size={14} />
                                      {post.num_comments}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {post.pdf_keywords.map((kw) => (
                                    <Badge key={kw} variant="secondary" className="text-xs">
                                      {kw}
                                    </Badge>
                                  ))}
                                  {post.is_complaint && post.complaint_keywords.map((kw) => (
                                    <Badge key={kw} variant="destructive" className="text-xs">
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>

                                {post.comments.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                      Top Comments ({post.comments.length})
                                    </p>
                                    {post.comments.slice(0, 3).map((comment, cidx) => (
                                      <div
                                        key={cidx}
                                        className={`p-3 rounded text-sm ${
                                          comment.is_complaint
                                            ? 'bg-red-500/10 border border-red-500/20'
                                            : 'bg-white/5'
                                        }`}
                                      >
                                        <p className="text-foreground line-clamp-2">{comment.body}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                          <span>{comment.score} points</span>
                                          {comment.is_complaint && (
                                            <Badge variant="destructive" className="text-xs">
                                              Complaint
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-strong border-border/50">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Report Selected</h3>
                  <p className="text-muted-foreground">
                    Select a report from the list or run the tracker to generate a new one.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
