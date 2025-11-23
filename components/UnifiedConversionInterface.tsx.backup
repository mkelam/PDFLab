"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, ChevronDown, Upload, FileText, Download, CheckCircle, X, Presentation, FileSpreadsheet, Image as ImageIcon, FileType } from "lucide-react"
import { PDFUpload } from "@/components/PDFUpload"
import { ConversionResponse, pdflabAPI, formatFileSize, validatePDFFile, EnhancedAPIError } from "@/lib/api"
import { GuestConversionPrompt } from "@/components/GuestConversionPrompt"
import { ErrorDisplay, type EnhancedError } from "@/components/ErrorDisplay"
import { trackErrorResolution } from "@/lib/enhanced-error-handler"

interface UnifiedConversionInterfaceProps {
  onSuccess?: (result: ConversionResponse) => void
  onError?: (error: string) => void
}

type TabMode = "convert" | "merge" | "compress"
type OutputFormat = "image" | "powerpoint" | "word" | "excel"
type CompressionLevel = "good" | "recommended" | "extreme"
type ConversionMode = "single" | "batch"

interface UploadedFile {
  file: File
  id: string
  valid: boolean
  error?: string
}

interface ProcessingState {
  isProcessing: boolean
  progress: number
  stage: string
  timeRemaining?: string
  result?: ConversionResponse
  error?: string
  isGuest?: boolean
  batchJobIds?: string[] // For batch downloads
}

export function UnifiedConversionInterface({ onSuccess, onError }: UnifiedConversionInterfaceProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("convert") // Auto-select Convert mode (most popular)
  const [conversionMode, setConversionMode] = useState<ConversionMode>("single")
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("powerpoint")
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("recommended")
  const [showFutureFeatureAlert, setShowFutureFeatureAlert] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: "",
  })
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showGuestPrompt, setShowGuestPrompt] = useState(false)
  const [enhancedError, setEnhancedError] = useState<EnhancedError | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // File handling
  const maxFiles = activeTab === "convert" ? (conversionMode === "batch" ? 10 : 1) : 10
  const acceptedFiles = { "application/pdf": [".pdf"] }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => {
      const validation = validatePDFFile(file)
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        valid: validation.valid,
        error: validation.error,
      }
    })

    if (activeTab === "convert" && conversionMode === "single") {
      setUploadedFiles(newFiles.slice(0, 1))
    } else {
      setUploadedFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles))
    }
  }, [activeTab, conversionMode, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    maxFiles,
    disabled: processing.isProcessing,
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // Map output format to PDFUpload mode
  const getPDFUploadMode = () => {
    if (activeTab === "merge") return "merge"
    if (outputFormat === "image") return "image"
    if (outputFormat === "powerpoint") return "convert"
    // Word and Excel are future features - default to convert for now
    return "convert"
  }

  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab)
    setShowFutureFeatureAlert(false)
    setUploadedFiles([]) // Clear files when switching modes
    // Reset to default output format when switching tabs
    if (tab === "convert") {
      setOutputFormat("powerpoint")
      setConversionMode("single") // Reset to single mode when switching to convert tab
    }
  }

  const processFiles = async () => {
    const validFiles = uploadedFiles.filter((f) => f.valid)

    if (validFiles.length === 0) {
      onError?.("No valid files to process")
      return
    }

    if (activeTab === "merge" && validFiles.length < 2) {
      onError?.("At least 2 PDF files are required for merging")
      return
    }

    // Note: Word and Excel are now supported via CloudConvert

    setProcessing({
      isProcessing: true,
      progress: 0,
      stage: activeTab === "convert"
        ? `Converting to ${outputFormat === "image" ? "images" : "PowerPoint"}...`
        : activeTab === "compress"
        ? "Compressing PDF..."
        : "Merging PDF files...",
    })

    try {
      // Progress updates
      let progressTimer: NodeJS.Timeout | null = null;
      let currentStage = 0;

      const formatName = outputFormat === "powerpoint" ? "PowerPoint" : outputFormat === "word" ? "Word" : outputFormat === "excel" ? "Excel" : "images"
      const stages = activeTab === "convert" ? [
        { progress: 20, stage: "Analyzing PDF structure...", timeRemaining: "4 seconds remaining" },
        { progress: 40, stage: "Extracting content with OCR...", timeRemaining: "3 seconds remaining" },
        { progress: 60, stage: "Processing layout...", timeRemaining: "2 seconds remaining" },
        { progress: 80, stage: outputFormat === "image" ? "Creating images..." : `Creating editable ${formatName}...`, timeRemaining: "1 second remaining" },
        { progress: 90, stage: "Finalizing...", timeRemaining: "Almost done..." }
      ] : activeTab === "compress" ? [
        { progress: 25, stage: "Analyzing PDF content...", timeRemaining: "2 seconds remaining" },
        { progress: 50, stage: `Applying ${compressionLevel} compression...`, timeRemaining: "1 second remaining" },
        { progress: 75, stage: "Optimizing file size...", timeRemaining: "Almost done..." },
        { progress: 90, stage: "Finalizing...", timeRemaining: "Almost done..." }
      ] : [
        { progress: 25, stage: "Preparing files...", timeRemaining: "1 second remaining" },
        { progress: 50, stage: "Merging PDFs...", timeRemaining: "1 second remaining" },
        { progress: 75, stage: "Optimizing output...", timeRemaining: "Almost done..." },
        { progress: 90, stage: "Finalizing merge...", timeRemaining: "Almost done..." }
      ];

      progressTimer = setInterval(() => {
        if (currentStage < stages.length) {
          const currentStageData = stages[currentStage];
          if (currentStageData) {
            setProcessing((prev) => ({
              ...prev,
              progress: currentStageData.progress,
              stage: currentStageData.stage,
              timeRemaining: currentStageData.timeRemaining,
            }))
            currentStage++;
          }
        } else {
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
          }
        }
      }, 800)

      let result: ConversionResponse

      if (activeTab === "convert") {
        // Check if batch mode with multiple files
        if (conversionMode === "batch" && validFiles.length > 1) {
          // Map output format to API format
          const apiFormat = outputFormat === "image" ? "images" : outputFormat === "powerpoint" ? "pptx" : outputFormat === "word" ? "docx" : "xlsx"

          // Upload batch
          const batchResponse = await pdflabAPI.batchConvertPDFs(
            validFiles.map(f => f.file),
            apiFormat as "pptx" | "docx" | "xlsx" | "images"
          )

          // Poll all jobs in parallel
          const batchResults = await pdflabAPI.pollBatchJobStatuses(batchResponse.job_ids)

          // Check if any failed
          const failedJobs = batchResults.filter(r => r.error)
          const successfulJobs = batchResults.filter(r => !r.error)

          if (failedJobs.length > 0 && successfulJobs.length === 0) {
            // All failed
            throw new Error(`Batch conversion failed: ${failedJobs[0].error}`)
          }

          // Store all successful job IDs for ZIP download
          const successfulJobIds = successfulJobs.map(j => j.jobId)

          // Return batch result (UI will show batch summary with ZIP download)
          result = {
            success: true,
            message: `${successfulJobs.length}/${validFiles.length} files converted successfully`,
            outputFile: 'batch', // Special marker for batch downloads
            originalFile: `${successfulJobs.length} files`,
            processingTime: '~5 seconds per file',
            fileCount: successfulJobs.length,
            jobId: successfulJobIds[0] || 'batch' // Use first job ID for any legacy code
          }

          // We'll set batch job IDs after setting the result
          // Store this for later
          const tempBatchJobIds = successfulJobIds

          if (progressTimer) clearInterval(progressTimer)

          setProcessing({
            isProcessing: false,
            progress: 100,
            stage: "Complete!",
            result,
            isGuest: result.isGuest,
            batchJobIds: tempBatchJobIds // Set batch job IDs here
          })

          // Show guest prompt for guest users
          if (result.isGuest) {
            setShowGuestPrompt(true)
          }

          onSuccess?.(result)

          // Exit early to skip the normal processing state update
          return
        } else {
          // Single file conversion
          if (outputFormat === "image") {
            result = await pdflabAPI.convertPDFToImages(validFiles[0].file)
          } else {
            // Map output format to API format
            const apiFormat = outputFormat === "powerpoint" ? "pptx" : outputFormat === "word" ? "docx" : "xlsx"
            result = await pdflabAPI.convertPDFToOffice(validFiles[0].file, apiFormat as "pptx" | "docx" | "xlsx")
          }
        }
      } else if (activeTab === "compress") {
        result = await pdflabAPI.compressPDF(validFiles[0].file, compressionLevel)
      } else {
        result = await pdflabAPI.mergePDFs(validFiles.map((f) => f.file))
      }

      if (progressTimer) clearInterval(progressTimer)

      setProcessing({
        isProcessing: false,
        progress: 100,
        stage: "Complete!",
        result,
        isGuest: result.isGuest,
      })

      // Show guest prompt for guest users
      if (result.isGuest) {
        setShowGuestPrompt(true)
      }

      onSuccess?.(result)
    } catch (error) {
      // Check if it's an enhanced error with rich data
      if (error instanceof EnhancedAPIError && error.errorResponse.shouldShowModal) {
        setEnhancedError(error.errorResponse.details)
        setProcessing({
          isProcessing: false,
          progress: 0,
          stage: "",
        })
        return
      }

      let errorMessage = error instanceof Error ? error.message : "Processing failed"

      // Enhanced error messages with actionable suggestions
      if (errorMessage.includes("File too large") || errorMessage.includes("exceeds")) {
        const fileSize = validFiles[0]?.file.size
        const sizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(1) : "unknown"
        errorMessage = `File too large (${sizeMB}MB). Free plan limit: 10MB.`
      } else if (errorMessage.includes("corrupt") || errorMessage.includes("invalid") || errorMessage.includes("parse")) {
        errorMessage = "This PDF appears to be corrupted or password-protected. Try a different file or remove the password first."
      } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        errorMessage = "Conversion timed out. This usually happens with large or complex files. Try converting to images instead."
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again."
      }

      setProcessing({
        isProcessing: false,
        progress: 0,
        stage: "",
        error: errorMessage,
      })
      onError?.(errorMessage)
    }
  }

  const downloadFile = async () => {
    if (processing.result?.outputFile) {
      // Check if this is a batch download
      if (processing.result.outputFile === 'batch' && processing.batchJobIds && processing.batchJobIds.length > 0) {
        try {
          await pdflabAPI.downloadBatchConversionZip(
            processing.batchJobIds,
            `pdflab-batch-${processing.batchJobIds.length}files`
          )
          toast({
            title: "Download started",
            description: `Downloading ${processing.batchJobIds.length} converted files as ZIP`,
            variant: "success",
            duration: 3000,
          })
        } catch (error) {
          toast({
            title: "Download failed",
            description: error instanceof Error ? error.message : "Failed to download batch files",
            variant: "destructive",
            duration: 5000,
          })
        }
      } else {
        // Single file download
        pdflabAPI.triggerDownload(
          processing.result.outputFile,
          processing.result.originalFile || processing.result.outputFile
        )
      }
    }
  }

  const handleGuestSignup = () => {
    // Close the prompt and allow navigation to signup page
    setShowGuestPrompt(false)
  }

  const handleGuestContinue = () => {
    // Close the prompt and allow download
    setShowGuestPrompt(false)
    downloadFile()
  }

  const handleResetClick = () => {
    // Show confirmation dialog if files are uploaded and not yet processed
    if (uploadedFiles.length > 0 && !processing.result && !processing.error) {
      setShowResetDialog(true)
    } else {
      confirmReset()
    }
  }

  const confirmReset = () => {
    setUploadedFiles([])
    setProcessing({
      isProcessing: false,
      progress: 0,
      stage: "",
      error: undefined,
      result: undefined,
      timeRemaining: undefined
    })
    setShowResetDialog(false)

    // Show success toast
    toast({
      title: "Ready for next file",
      description: "Interface reset. You can upload a new PDF now.",
      variant: "success",
      duration: 3000,
    })
  }

  const retryConversion = () => {
    // Clear error state and retry with existing files
    setProcessing({ isProcessing: false, progress: 0, stage: "" })
    // Automatically start processing again
    processFiles()
  }

  const handleOutputFormatChange = (format: OutputFormat) => {
    setOutputFormat(format)
    setShowFutureFeatureAlert(false) // All formats now supported via CloudConvert
  }

  const getUploadText = () => {
    if (activeTab === "merge") {
      return {
        title: "Drop multiple PDFs here",
        subtitle: "Select 2 or more PDF files to merge"
      }
    }
    if (activeTab === "convert" && conversionMode === "batch") {
      return {
        title: "Drop multiple PDFs here",
        subtitle: `Add up to ${maxFiles} PDF files`
      }
    }
    return {
      title: "Drop your PDF here",
      subtitle: "Or click to browse files"
    }
  }

  const uploadText = getUploadText()

  return (
    <div className="space-y-6">
      {/* 3-Card Pipeline Interface - Responsive Design */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center max-w-7xl mx-auto">
        {/* CARD 1: Setup */}
        <Card className="glass w-full lg:flex-1 lg:max-w-[400px]">
          <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
            <div className="text-center border-b border-primary/20 pb-2 mb-2">
              <h3 className="text-primary font-semibold text-sm lg:text-base">Step 1</h3>
            </div>

            {/* Subsection 1: Choose Mode */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">1. Choose Mode</h4>
              <div className="flex flex-col gap-2 flex-1 justify-center">
                <button
                  onClick={() => handleTabChange("convert")}
                  data-testid="convert-mode-button"
                  className={`
                    p-3 rounded-lg text-center font-medium transition-all duration-300 border relative
                    ${activeTab === "convert"
                      ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Convert</span>
                    <Badge className="bg-primary/30 text-primary text-[10px] px-1.5 py-0.5 font-normal">
                      Most popular
                    </Badge>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange("merge")}
                  data-testid="merge-mode-button"
                  className={`
                    p-2 rounded-lg text-center font-medium transition-all duration-300 border
                    ${activeTab === "merge"
                      ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                >
                  Merge
                </button>
                <button
                  onClick={() => handleTabChange("compress")}
                  data-testid="compress-mode-button"
                  className={`
                    p-2 rounded-lg text-center font-medium transition-all duration-300 border
                    ${activeTab === "compress"
                      ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Compress</span>
                    <Badge className="bg-green-500/20 text-green-700 text-[10px] px-1.5 py-0.5 font-normal">
                      New
                    </Badge>
                  </div>
                </button>
              </div>
            </div>

            {/* Batch Mode Toggle - Only visible in Convert mode */}
            {activeTab === "convert" && (
              <div className="border-t border-primary/10 pt-3 pb-2">
                <div className="flex items-center justify-center gap-1 bg-muted/20 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setConversionMode("single")
                      setUploadedFiles([]) // Clear files when switching mode
                    }}
                    className={`
                      flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
                      ${conversionMode === "single"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-primary"
                      }
                    `}
                  >
                    Single File
                  </button>
                  <button
                    onClick={() => {
                      setConversionMode("batch")
                      setUploadedFiles([]) // Clear files when switching mode
                    }}
                    className={`
                      flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1
                      ${conversionMode === "batch"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-primary"
                      }
                    `}
                  >
                    <span>Batch Processing</span>
                    <Badge className="bg-purple-500/20 text-purple-700 text-[9px] px-1 py-0 font-normal border-0">
                      Pro
                    </Badge>
                  </button>
                </div>
              </div>
            )}

            {/* Subsection 2: Drag and Drop */}
            <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">2. Drag and Drop</h4>
              <div
                {...getRootProps()}
                data-testid="file-upload-dropzone"
                className={`
                  border-2 border-dashed rounded-lg p-6 lg:p-4 text-center cursor-pointer transition-all flex-1 flex flex-col justify-center min-h-[120px] lg:min-h-auto
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
                  ${processing.isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    {processing.isProcessing ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {uploadText.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {uploadText.subtitle}
                    </p>
                  </div>
                  {isDragActive && (
                    <Badge className="bg-primary/20 text-primary text-xs">
                      Drop files here
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  PDF files only • Free: 10MB max • Pro: 100MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Configure */}
        <Card className="glass w-full lg:flex-1 lg:max-w-[350px]">
          <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
            <div className="text-center border-b border-primary/20 pb-2 mb-2">
              <h3 className="text-primary font-semibold text-sm lg:text-base">Step 2</h3>
            </div>

            {/* Subsection 3: Select Output / Compression Level */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">
                {activeTab === "compress" ? "3. Compression Level" : "3. Select Output"}
              </h4>
              <div className="flex flex-col justify-center flex-1 space-y-2">
                {activeTab === "merge" ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    PDF output format
                  </div>
                ) : activeTab === "compress" ? (
                  <div className="flex flex-col gap-2">
                    {(["good", "recommended", "extreme"] as CompressionLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setCompressionLevel(level)}
                        data-testid={`compression-level-${level}`}
                        className={`
                          p-3 rounded-lg border transition-all duration-200 flex flex-col items-start gap-1
                          ${compressionLevel === level
                            ? "bg-primary/20 border-primary text-primary shadow-md"
                            : "bg-muted/20 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xs font-semibold capitalize">{level}</span>
                          {level === "recommended" && (
                            <Badge className="bg-primary/30 text-primary text-[9px] px-1.5 py-0.5 font-normal ml-auto">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-left">
                          {level === "good" && "Best quality, moderate compression"}
                          {level === "recommended" && "Balanced quality & file size"}
                          {level === "extreme" && "Maximum compression, lower quality"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(["powerpoint", "word", "excel", "image"] as OutputFormat[]).map((format) => {
                      // Get icon component for each format
                      const IconComponent = format === "image" ? ImageIcon :
                        format === "powerpoint" ? Presentation :
                        format === "word" ? FileType :
                        FileSpreadsheet

                      return (
                        <button
                          key={format}
                          onClick={() => handleOutputFormatChange(format)}
                          data-testid={`output-format-option-${format}`}
                          className={`
                            p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 hover:scale-105
                            ${outputFormat === format
                              ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                              : "bg-muted/20 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/10"
                            }
                          `}
                        >
                          <IconComponent className={`${outputFormat === format ? 'w-10 h-10' : 'w-8 h-8'} ${outputFormat === format ? 'text-primary' : 'text-muted-foreground'} transition-all duration-200`} />
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-semibold transition-all duration-200 ${outputFormat === format ? 'text-base' : 'text-sm'}`}>
                              {format === "image" && "Images"}
                              {format === "powerpoint" && "PowerPoint"}
                              {format === "word" && "Word"}
                              {format === "excel" && "Excel"}
                            </span>
                            <span className={`text-center leading-tight transition-all duration-200 ${outputFormat === format ? 'text-xs opacity-90' : 'text-[11px] opacity-80'}`}>
                              {format === "powerpoint" && "Slides/Images"}
                              {format === "word" && "Text-heavy"}
                              {format === "excel" && "Tables only"}
                              {format === "image" && "JPG format"}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Subsection 4: Files Ready */}
            <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">4. Files Ready</h4>
              <div className="flex-1">
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((fileItem) => (
                      <div
                        key={fileItem.id}
                        data-testid="uploaded-file-item"
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs truncate">{fileItem.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileItem.file.size)}
                            </p>
                          </div>
                          {fileItem.valid ? (
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileItem.id)}
                          disabled={processing.isProcessing}
                          data-testid="remove-file-button"
                          className="p-1 h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No files uploaded yet
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: Execute */}
        <Card className="glass w-full lg:flex-1 lg:max-w-[420px]">
          <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
            <div className="text-center border-b border-primary/20 pb-2 mb-2">
              <h3 className="text-primary font-semibold text-sm lg:text-base">Step 3</h3>
            </div>

            {/* Subsection 5: Processing */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">5. Processing</h4>
              <div className="flex-1 flex flex-col justify-center">
                {processing.isProcessing ? (
                  <div className="text-center space-y-3">
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <p className="font-medium text-sm">{processing.stage}</p>
                    <Progress value={processing.progress} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{processing.progress}% complete</span>
                      {processing.timeRemaining && (
                        <span className="text-primary">{processing.timeRemaining}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    {uploadedFiles.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm">Ready to process files</p>
                        <Button
                          onClick={processFiles}
                          disabled={uploadedFiles.filter(f => f.valid).length === 0 ||
                            (activeTab === "merge" && uploadedFiles.filter(f => f.valid).length < 2)}
                          data-testid="process-files-button"
                          className="bg-primary hover:bg-primary/90"
                        >
                          {activeTab === "convert" ? (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {conversionMode === "batch" && uploadedFiles.length > 1 ? (
                                <>
                                  {outputFormat === "image" && `Export ${uploadedFiles.length} Files to Images`}
                                  {outputFormat === "powerpoint" && `Convert ${uploadedFiles.length} Files to PowerPoint`}
                                  {outputFormat === "word" && `Convert ${uploadedFiles.length} Files to Word`}
                                  {outputFormat === "excel" && `Convert ${uploadedFiles.length} Files to Excel`}
                                </>
                              ) : (
                                <>
                                  {outputFormat === "image" && "Export to Images"}
                                  {outputFormat === "powerpoint" && "Convert to PowerPoint"}
                                  {outputFormat === "word" && "Convert to Word"}
                                  {outputFormat === "excel" && "Convert to Excel"}
                                </>
                              )}
                            </>
                          ) : activeTab === "compress" ? (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Compress PDF
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Merge PDFs
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm">Upload files to start processing</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subsection 6: Download Ready */}
            <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
              <h4 className="text-primary/90 text-xs font-semibold mb-2">6. Download Ready</h4>
              <div className="flex-1 flex flex-col justify-center">
                {processing.result ? (
                  <div className="text-center space-y-3">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                    <div>
                      <h4 className="font-semibold text-green-700 text-sm">
                        {activeTab === "convert"
                          ? (outputFormat === "image" ? "Export Complete!" : "Conversion Complete!")
                          : activeTab === "compress"
                          ? "Compression Complete!"
                          : "Merge Complete!"
                        }
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {processing.result.message}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Processing time: {processing.result.processingTime}</p>
                      {processing.result.outputFile === 'batch' && processing.batchJobIds ? (
                        <p>Output: {processing.batchJobIds.length} files ready as ZIP</p>
                      ) : (
                        <p>Output: {processing.result.outputFile}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          if (processing.isGuest) {
                            setShowGuestPrompt(true)
                          } else {
                            downloadFile()
                          }
                        }}
                        data-testid="download-button"
                        className="bg-green-600 hover:bg-green-700 text-xs px-3 py-2"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {processing.result.outputFile === 'batch' ? 'Download ZIP' : 'Download'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetClick}
                        disabled={processing.isProcessing}
                        data-testid="reset-button"
                        className="text-xs px-3 py-2"
                      >
                        Process Another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Download will be available after processing</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excel Format Warning */}
      {activeTab === "convert" && outputFormat === "excel" && !processing.isProcessing && !processing.result && (
        <div className="max-w-7xl mx-auto">
          <Alert className="border-teal-500/30 bg-black/40 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-teal-400" />
            <AlertDescription className="text-teal-300">
              <strong>Excel conversion works best with PDFs containing tables.</strong> If your PDF has mostly text or images, consider using Word or PowerPoint format instead.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Error State */}
      {processing.error && (
        <div className="max-w-7xl mx-auto">
          <Alert className="border-red-200" data-testid="conversion-error-message">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              <div className="flex flex-col gap-3">
                <span>{processing.error}</span>
                <div className="flex flex-wrap gap-2">
                  {/* File too large error */}
                  {processing.error.includes("File too large") && (
                    <>
                      <Button
                        onClick={() => window.open("/pricing", "_blank")}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        Upgrade to Pro (100MB)
                      </Button>
                      <Button
                        onClick={handleResetClick}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Try Different File
                      </Button>
                    </>
                  )}

                  {/* Corrupted file error */}
                  {processing.error.includes("corrupted") && (
                    <>
                      <Button
                        onClick={handleResetClick}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Upload Different File
                      </Button>
                      <Button
                        onClick={() => window.open("mailto:support@pdflab.pro?subject=Corrupted PDF Help", "_blank")}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Contact Support
                      </Button>
                    </>
                  )}

                  {/* Timeout error */}
                  {processing.error.includes("timed out") && (
                    <>
                      <Button
                        onClick={() => {
                          setOutputFormat("image")
                          retryConversion()
                        }}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                        data-testid="try-images-button"
                      >
                        Try Converting to Images
                      </Button>
                      <Button
                        onClick={retryConversion}
                        data-testid="retry-conversion-button"
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Retry
                      </Button>
                    </>
                  )}

                  {/* XLSX conversion error (no table data) */}
                  {processing.error.includes("XLSX") && processing.error.includes("table data") && (
                    <>
                      <Button
                        onClick={() => {
                          setOutputFormat("word")
                          setProcessing({ isProcessing: false, progress: 0, stage: "" })
                        }}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        Try Word Instead
                      </Button>
                      <Button
                        onClick={() => {
                          setOutputFormat("powerpoint")
                          setProcessing({ isProcessing: false, progress: 0, stage: "" })
                        }}
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        Try PowerPoint Instead
                      </Button>
                      <Button
                        onClick={handleResetClick}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Upload Different File
                      </Button>
                    </>
                  )}

                  {/* Network error or generic error */}
                  {(processing.error.includes("Network") ||
                    (!processing.error.includes("File too large") &&
                     !processing.error.includes("corrupted") &&
                     !processing.error.includes("timed out") &&
                     !processing.error.includes("XLSX"))) && (
                    <>
                      <Button
                        onClick={retryConversion}
                        data-testid="retry-conversion-button"
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={handleResetClick}
                        size="sm"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        Start Over
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset conversion interface?</AlertDialogTitle>
            <AlertDialogDescription>
              You have uploaded files that haven't been processed yet. Are you sure you want to reset? This will clear all uploaded files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guest Conversion Prompt */}
      <GuestConversionPrompt
        open={showGuestPrompt}
        onOpenChange={setShowGuestPrompt}
        onSignup={handleGuestSignup}
        onContinue={handleGuestContinue}
      />

      {/* Enhanced Error Display Modal */}
      {enhancedError && (
        <ErrorDisplay
          error={enhancedError}
          onClose={() => setEnhancedError(null)}
          onAction={(action, url) => {
            trackErrorResolution(enhancedError.error, action, url)
            setEnhancedError(null)
            if (url) {
              window.location.href = url
            }
          }}
        />
      )}
    </div>
  )
}