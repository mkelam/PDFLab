"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, X, Download, Zap, AlertCircle } from "lucide-react"
import { pdflabAPI, formatFileSize, validatePDFFile } from "@/lib/api"

interface UploadedFile {
  file: File
  id: string
  valid: boolean
  error?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
}

interface BatchStatus {
  batch_id: string
  batch_name: string
  operation_type: string
  status: string
  progress: number
  total_files: number
  completed_files: number
  failed_files: number
  success_rate: number
  files: Array<{
    job_id: string
    file_name: string
    status: string
    progress: number
    error_message?: string
  }>
}

export default function BatchDemoPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [batchOperation, setBatchOperation] = useState<'convert' | 'compress' | 'merge'>('convert')
  const [outputFormat, setOutputFormat] = useState<'pptx' | 'docx' | 'xlsx' | 'png'>('pptx')
  const [compressionLevel, setCompressionLevel] = useState<'good' | 'recommended' | 'extreme'>('recommended')
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Dropzone for multi-file upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => {
      const validation = validatePDFFile(file)
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        valid: validation.valid,
        error: validation.error,
        status: 'pending' as const
      }
    })

    setUploadedFiles((prev) => [...prev, ...newFiles].slice(0, 50))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 50,
    disabled: isProcessing,
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // Process batch
  const processBatch = async () => {
    const validFiles = uploadedFiles.filter((f) => f.valid)

    if (validFiles.length < 2) {
      setError("At least 2 files required for batch processing")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Upload batch
      const result = await pdflabAPI.uploadBatch(
        validFiles.map(f => f.file),
        batchOperation,
        {
          batchName: `Batch ${new Date().toLocaleString()}`,
          outputFormat: batchOperation === 'convert' ? outputFormat : undefined,
          compressionLevel: batchOperation === 'compress' ? compressionLevel : undefined
        }
      )

      setCurrentBatchId(result.batch_id)

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await pdflabAPI.getBatchStatus(result.batch_id)
          setBatchStatus(status)

          // Update individual file statuses
          setUploadedFiles(prev => prev.map(file => {
            const jobStatus = status.files.find(f => f.file_name === file.file.name)
            if (jobStatus) {
              return {
                ...file,
                status: jobStatus.status as any,
                progress: jobStatus.progress
              }
            }
            return file
          }))

          // Stop polling when complete
          if (status.status === 'completed' || status.status === 'partial' || status.status === 'failed') {
            clearInterval(pollInterval)
            setIsProcessing(false)
          }
        } catch (err) {
          console.error('Poll error:', err)
        }
      }, 2000) // Poll every 2 seconds

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch processing failed')
      setIsProcessing(false)
    }
  }

  // Download ZIP
  const downloadZip = async () => {
    if (!currentBatchId || !batchStatus) return

    try {
      await pdflabAPI.downloadBatchZip(currentBatchId, batchStatus.batch_name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const reset = () => {
    setUploadedFiles([])
    setBatchStatus(null)
    setCurrentBatchId(null)
    setError(null)
    setIsProcessing(false)
  }

  const totalSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary flex items-center justify-center gap-2">
            <Zap className="w-8 h-8" />
            Batch Processing Demo
          </h1>
          <p className="text-muted-foreground">
            Upload 2-50 PDFs and process them all at once!
          </p>
        </div>

        {/* 3-Card Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CARD 1: Setup & Upload */}
          <Card className="glass">
            <CardContent className="p-6 space-y-4">
              <div className="text-center border-b border-primary/20 pb-3">
                <h3 className="text-primary font-semibold">Step 1: Setup</h3>
              </div>

              {/* Batch Operation */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-primary/90">1. Choose Operation</h4>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setBatchOperation('convert')}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${batchOperation === 'convert'
                        ? 'bg-primary/20 border-primary text-primary shadow-md'
                        : 'bg-muted/20 border-border hover:border-primary/50'
                      }
                    `}
                  >
                    Convert All
                  </button>
                  <button
                    onClick={() => setBatchOperation('compress')}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${batchOperation === 'compress'
                        ? 'bg-primary/20 border-primary text-primary shadow-md'
                        : 'bg-muted/20 border-border hover:border-primary/50'
                      }
                    `}
                  >
                    Compress All
                  </button>
                  <button
                    onClick={() => setBatchOperation('merge')}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${batchOperation === 'merge'
                        ? 'bg-primary/20 border-primary text-primary shadow-md'
                        : 'bg-muted/20 border-border hover:border-primary/50'
                      }
                    `}
                  >
                    Merge All
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-primary/90">2. Upload Files (2-50)</h4>
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-12 h-12 text-primary" />
                    <p className="font-medium text-sm">
                      Drop multiple PDFs here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Or click to browse
                    </p>
                    {isDragActive && (
                      <Badge className="bg-primary/20 text-primary text-xs">
                        Drop files here
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* File Count */}
              {uploadedFiles.length > 0 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-semibold">{uploadedFiles.length} files selected</p>
                  <p className="text-xs text-muted-foreground">Total: {formatFileSize(totalSize)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARD 2: Configure & Files List */}
          <Card className="glass">
            <CardContent className="p-6 space-y-4">
              <div className="text-center border-b border-primary/20 pb-3">
                <h3 className="text-primary font-semibold">Step 2: Configure</h3>
              </div>

              {/* Options */}
              {batchOperation === 'convert' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary/90">3. Output Format</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['pptx', 'docx', 'xlsx', 'png'] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => setOutputFormat(format)}
                        className={`
                          p-3 rounded-lg border transition-all
                          ${outputFormat === format
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-muted/20 border-border hover:border-primary/50'
                          }
                        `}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {batchOperation === 'compress' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary/90">3. Compression Level</h4>
                  <div className="flex flex-col gap-2">
                    {(['good', 'recommended', 'extreme'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setCompressionLevel(level)}
                        className={`
                          p-3 rounded-lg border transition-all
                          ${compressionLevel === level
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-muted/20 border-border hover:border-primary/50'
                          }
                        `}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Files List */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-primary/90">4. Files Ready</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {uploadedFiles.length > 0 ? (
                    uploadedFiles.map((fileItem) => (
                      <div
                        key={fileItem.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {fileItem.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : fileItem.status === 'processing' ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          ) : fileItem.status === 'failed' ? (
                            <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs truncate">{fileItem.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileItem.file.size)}
                              {fileItem.progress !== undefined && ` • ${fileItem.progress}%`}
                            </p>
                          </div>
                          {!isProcessing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(fileItem.id)}
                              className="p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No files uploaded yet
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: Execute & Download */}
          <Card className="glass">
            <CardContent className="p-6 space-y-4">
              <div className="text-center border-b border-primary/20 pb-3">
                <h3 className="text-primary font-semibold">Step 3: Execute</h3>
              </div>

              {/* Processing */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-primary/90">5. Processing</h4>
                {isProcessing || batchStatus ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="font-medium text-sm mb-2">
                        {batchStatus ? `${batchStatus.completed_files} of ${batchStatus.total_files} files` : 'Starting batch...'}
                      </p>
                      <Progress value={batchStatus?.progress || 0} className="w-full" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {batchStatus?.progress || 0}% complete
                      </p>
                    </div>

                    {batchStatus && batchStatus.failed_files > 0 && (
                      <div className="text-center p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-700">
                          {batchStatus.failed_files} file(s) failed
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {uploadedFiles.length >= 2 ? 'Ready to process batch' : 'Upload at least 2 files'}
                    </p>
                    <Button
                      onClick={processBatch}
                      disabled={uploadedFiles.length < 2 || isProcessing}
                      className="bg-primary hover:bg-primary/90 w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Process Batch ({uploadedFiles.length} files)
                    </Button>
                  </div>
                )}
              </div>

              {/* Download */}
              <div className="border-t border-primary/10 pt-4">
                <h4 className="text-sm font-semibold mb-2 text-primary/90">6. Download</h4>
                {batchStatus && (batchStatus.status === 'completed' || batchStatus.status === 'partial') ? (
                  <div className="text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <h4 className="font-semibold text-green-700">Batch Complete!</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Success rate: {batchStatus.success_rate}%
                      </p>
                    </div>
                    <Button
                      onClick={downloadZip}
                      className="bg-green-600 hover:bg-green-700 w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP ({batchStatus.completed_files} files)
                    </Button>
                    <Button
                      onClick={reset}
                      variant="outline"
                      className="w-full"
                    >
                      Process Another Batch
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    ZIP download will be available after processing
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-700">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
