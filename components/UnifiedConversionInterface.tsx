"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { AlertCircle } from "lucide-react"
import { ConversionResponse, pdflabAPI, EnhancedAPIError } from "@/lib/api"
import { GuestConversionPrompt } from "@/components/GuestConversionPrompt"
import { ErrorDisplay, type EnhancedError } from "@/components/ErrorDisplay"
import { trackErrorResolution } from "@/lib/enhanced-error-handler"
import { SetupCard, ConfigureCard, ExecuteCard, ConversionErrorDisplay } from "@/components/conversion"
import { useFileUpload } from "@/hooks/useFileUpload"
import { useConversionProcessing } from "@/hooks/useConversionProcessing"
import {
  TabMode,
  OutputFormat,
  CompressionLevel,
  ConversionMode,
  getMaxFiles,
  getProgressStages,
  mapOutputFormatToAPI,
  enhanceErrorMessage,
} from "@/lib/conversion/conversion-utils"

interface UnifiedConversionInterfaceProps {
  onSuccess?: (result: ConversionResponse) => void
  onError?: (error: string) => void
}

export function UnifiedConversionInterface({
  onSuccess,
  onError,
}: UnifiedConversionInterfaceProps) {
  // UI State
  const [activeTab, setActiveTab] = useState<TabMode>("convert")
  const [conversionMode, setConversionMode] = useState<ConversionMode>("single")
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("powerpoint")
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("recommended")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showGuestPrompt, setShowGuestPrompt] = useState(false)
  const [enhancedError, setEnhancedError] = useState<EnhancedError | null>(null)
  const { toast } = useToast()

  // File Management
  const maxFiles = getMaxFiles(activeTab, conversionMode)
  const {
    uploadedFiles,
    validFiles,
    hasValidFiles,
    addFiles,
    replaceFiles,
    removeFile,
    clearFiles,
  } = useFileUpload({ maxFiles })

  // Processing Management
  const { processing, startProgressAnimation, completeProcessing, setError, reset } =
    useConversionProcessing()

  // File Drop Handler
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (activeTab === "convert" && conversionMode === "single") {
        replaceFiles(acceptedFiles.slice(0, 1))
      } else {
        addFiles(acceptedFiles)
      }
    },
    [activeTab, conversionMode, addFiles, replaceFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles,
    disabled: processing.isProcessing,
  })

  // Tab Change Handler
  const handleTabChange = (tab: TabMode) => {
    setActiveTab(tab)
    clearFiles()
    if (tab === "convert") {
      setOutputFormat("powerpoint")
      setConversionMode("single")
    }
  }

  // Conversion Mode Change Handler
  const handleConversionModeChange = (mode: ConversionMode) => {
    setConversionMode(mode)
    clearFiles()
  }

  // Process Files
  const processFiles = async () => {
    if (validFiles.length === 0) {
      onError?.("No valid files to process")
      return
    }

    if (activeTab === "merge" && validFiles.length < 2) {
      onError?.("At least 2 PDF files are required for merging")
      return
    }

    // Start progress animation
    const stages = getProgressStages(activeTab, outputFormat, compressionLevel)
    startProgressAnimation(stages)

    try {
      let result: ConversionResponse

      if (activeTab === "convert") {
        // Batch conversion
        if (conversionMode === "batch" && validFiles.length > 1) {
          const apiFormat = mapOutputFormatToAPI(outputFormat)
          const batchResponse = await pdflabAPI.batchConvertPDFs(
            validFiles.map((f) => f.file),
            apiFormat
          )

          const batchResults = await pdflabAPI.pollBatchJobStatuses(batchResponse.job_ids)
          const failedJobs = batchResults.filter((r) => r.error)
          const successfulJobs = batchResults.filter((r) => !r.error)

          if (failedJobs.length > 0 && successfulJobs.length === 0) {
            throw new Error(`Batch conversion failed: ${failedJobs[0].error}`)
          }

          const successfulJobIds = successfulJobs.map((j) => j.jobId)

          result = {
            success: true,
            message: `${successfulJobs.length}/${validFiles.length} files converted successfully`,
            outputFile: "batch",
            originalFile: `${successfulJobs.length} files`,
            processingTime: "~5 seconds per file",
            fileCount: successfulJobs.length,
            jobId: successfulJobIds[0] || "batch",
          }

          completeProcessing(result, successfulJobIds)

          if (result.isGuest) {
            setShowGuestPrompt(true)
          }

          onSuccess?.(result)
          return
        } else {
          // Single file conversion
          if (outputFormat === "image") {
            result = await pdflabAPI.convertPDFToImages(validFiles[0].file)
          } else {
            const apiFormat = mapOutputFormatToAPI(outputFormat)
            result = await pdflabAPI.convertPDFToOffice(
              validFiles[0].file,
              apiFormat as "pptx" | "docx" | "xlsx"
            )
          }
        }
      } else if (activeTab === "compress") {
        result = await pdflabAPI.compressPDF(validFiles[0].file, compressionLevel)
      } else {
        result = await pdflabAPI.mergePDFs(validFiles.map((f) => f.file))
      }

      completeProcessing(result)

      if (result.isGuest) {
        setShowGuestPrompt(true)
      }

      onSuccess?.(result)
    } catch (error) {
      // Check if it's an enhanced error with rich data
      if (error instanceof EnhancedAPIError && error.errorResponse.shouldShowModal) {
        setEnhancedError(error.errorResponse.details)
        reset()
        return
      }

      const errorMessage = enhanceErrorMessage(error as Error, validFiles[0]?.file.size)
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  // Download File
  const downloadFile = async () => {
    if (processing.result?.outputFile) {
      if (
        processing.result.outputFile === "batch" &&
        processing.batchJobIds &&
        processing.batchJobIds.length > 0
      ) {
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
        pdflabAPI.triggerDownload(
          processing.result.outputFile,
          processing.result.originalFile || processing.result.outputFile
        )
      }
    }
  }

  // Reset Handler
  const handleResetClick = () => {
    if (uploadedFiles.length > 0 && !processing.result && !processing.error) {
      setShowResetDialog(true)
    } else {
      confirmReset()
    }
  }

  const confirmReset = () => {
    clearFiles()
    reset()
    setShowResetDialog(false)

    toast({
      title: "Ready for next file",
      description: "Interface reset. You can upload a new PDF now.",
      variant: "success",
      duration: 3000,
    })
  }

  // Retry Conversion
  const retryConversion = () => {
    reset()
    processFiles()
  }

  // Format Change Handlers
  const handleOutputFormatChange = (format: OutputFormat) => {
    setOutputFormat(format)
  }

  const handleSwitchToImages = () => {
    setOutputFormat("image")
    retryConversion()
  }

  const handleSwitchToWord = () => {
    setOutputFormat("word")
    reset()
  }

  const handleSwitchToPowerPoint = () => {
    setOutputFormat("powerpoint")
    reset()
  }

  return (
    <div className="space-y-6">
      {/* 3-Card Pipeline Interface */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center max-w-7xl mx-auto">
        {/* CARD 1: Setup */}
        <SetupCard
          activeTab={activeTab}
          conversionMode={conversionMode}
          maxFiles={maxFiles}
          isDragActive={isDragActive}
          isProcessing={processing.isProcessing}
          onTabChange={handleTabChange}
          onConversionModeChange={handleConversionModeChange}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
        />

        {/* CARD 2: Configure */}
        <ConfigureCard
          activeTab={activeTab}
          outputFormat={outputFormat}
          compressionLevel={compressionLevel}
          uploadedFiles={uploadedFiles}
          isProcessing={processing.isProcessing}
          onOutputFormatChange={handleOutputFormatChange}
          onCompressionLevelChange={setCompressionLevel}
          onRemoveFile={removeFile}
        />

        {/* CARD 3: Execute */}
        <ExecuteCard
          activeTab={activeTab}
          outputFormat={outputFormat}
          conversionMode={conversionMode}
          processing={processing}
          uploadedFilesCount={uploadedFiles.length}
          validFilesCount={validFiles.length}
          isGuest={processing.isGuest || false}
          onProcess={processFiles}
          onDownload={downloadFile}
          onReset={handleResetClick}
          onShowGuestPrompt={() => setShowGuestPrompt(true)}
        />
      </div>

      {/* Excel Format Warning */}
      {activeTab === "convert" &&
        outputFormat === "excel" &&
        !processing.isProcessing &&
        !processing.result && (
          <div className="max-w-7xl mx-auto">
            <Alert className="border-teal-500/30 bg-black/40 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4 text-teal-400" />
              <AlertDescription className="text-teal-300">
                <strong>Excel conversion works best with PDFs containing tables.</strong> If your PDF
                has mostly text or images, consider using Word or PowerPoint format instead.
              </AlertDescription>
            </Alert>
          </div>
        )}

      {/* Error State */}
      {processing.error && (
        <ConversionErrorDisplay
          error={processing.error}
          onRetry={retryConversion}
          onReset={handleResetClick}
          onSwitchToImages={handleSwitchToImages}
          onSwitchToWord={handleSwitchToWord}
          onSwitchToPowerPoint={handleSwitchToPowerPoint}
        />
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset conversion interface?</AlertDialogTitle>
            <AlertDialogDescription>
              You have uploaded files that haven't been processed yet. Are you sure you want to
              reset? This will clear all uploaded files.
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
        onSignup={() => setShowGuestPrompt(false)}
        onContinue={() => {
          setShowGuestPrompt(false)
          downloadFile()
        }}
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
