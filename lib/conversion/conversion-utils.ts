export type TabMode = "convert" | "merge" | "compress"
export type OutputFormat = "image" | "powerpoint" | "word" | "excel"
export type CompressionLevel = "good" | "recommended" | "extreme"
export type ConversionMode = "single" | "batch"

interface ProgressStage {
  progress: number
  stage: string
  timeRemaining: string
}

/**
 * Get progress stages for different conversion modes
 */
export function getProgressStages(
  tabMode: TabMode,
  outputFormat: OutputFormat,
  compressionLevel: CompressionLevel
): ProgressStage[] {
  const formatName =
    outputFormat === "powerpoint"
      ? "PowerPoint"
      : outputFormat === "word"
      ? "Word"
      : outputFormat === "excel"
      ? "Excel"
      : "images"

  if (tabMode === "convert") {
    return [
      { progress: 20, stage: "Analyzing PDF structure...", timeRemaining: "4 seconds remaining" },
      { progress: 40, stage: "Extracting content with OCR...", timeRemaining: "3 seconds remaining" },
      { progress: 60, stage: "Processing layout...", timeRemaining: "2 seconds remaining" },
      {
        progress: 80,
        stage: outputFormat === "image" ? "Creating images..." : `Creating editable ${formatName}...`,
        timeRemaining: "1 second remaining",
      },
      { progress: 90, stage: "Finalizing...", timeRemaining: "Almost done..." },
    ]
  } else if (tabMode === "compress") {
    return [
      { progress: 25, stage: "Analyzing PDF content...", timeRemaining: "2 seconds remaining" },
      {
        progress: 50,
        stage: `Applying ${compressionLevel} compression...`,
        timeRemaining: "1 second remaining",
      },
      { progress: 75, stage: "Optimizing file size...", timeRemaining: "Almost done..." },
      { progress: 90, stage: "Finalizing...", timeRemaining: "Almost done..." },
    ]
  } else {
    // Merge mode
    return [
      { progress: 25, stage: "Preparing files...", timeRemaining: "1 second remaining" },
      { progress: 50, stage: "Merging PDFs...", timeRemaining: "1 second remaining" },
      { progress: 75, stage: "Optimizing output...", timeRemaining: "Almost done..." },
      { progress: 90, stage: "Finalizing merge...", timeRemaining: "Almost done..." },
    ]
  }
}

/**
 * Get upload zone text based on mode and conversion settings
 */
export function getUploadText(tabMode: TabMode, conversionMode: ConversionMode, maxFiles: number) {
  if (tabMode === "merge") {
    return {
      title: "Drop multiple PDFs here",
      subtitle: "Select 2 or more PDF files to merge",
    }
  }
  if (tabMode === "convert" && conversionMode === "batch") {
    return {
      title: "Drop multiple PDFs here",
      subtitle: `Add up to ${maxFiles} PDF files`,
    }
  }
  return {
    title: "Drop your PDF here",
    subtitle: "Or click to browse files",
  }
}

/**
 * Get PDFUpload mode based on current settings
 */
export function getPDFUploadMode(tabMode: TabMode, outputFormat: OutputFormat) {
  if (tabMode === "merge") return "merge"
  if (outputFormat === "image") return "image"
  if (outputFormat === "powerpoint") return "convert"
  // Word and Excel default to convert mode
  return "convert"
}

/**
 * Map output format to API format
 */
export function mapOutputFormatToAPI(
  outputFormat: OutputFormat
): "pptx" | "docx" | "xlsx" | "images" {
  switch (outputFormat) {
    case "powerpoint":
      return "pptx"
    case "word":
      return "docx"
    case "excel":
      return "xlsx"
    case "image":
      return "images"
  }
}

/**
 * Get max files allowed based on mode
 */
export function getMaxFiles(tabMode: TabMode, conversionMode: ConversionMode): number {
  return tabMode === "convert" ? (conversionMode === "batch" ? 10 : 1) : 10
}

/**
 * Enhance error message with actionable suggestions
 */
export function enhanceErrorMessage(error: Error | string, fileSize?: number): string {
  const errorMessage = error instanceof Error ? error.message : error

  if (errorMessage.includes("File too large") || errorMessage.includes("exceeds")) {
    const sizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(1) : "unknown"
    return `File too large (${sizeMB}MB). Free plan limit: 10MB.`
  } else if (
    errorMessage.includes("corrupt") ||
    errorMessage.includes("invalid") ||
    errorMessage.includes("parse")
  ) {
    return "This PDF appears to be corrupted or password-protected. Try a different file or remove the password first."
  } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return "Conversion timed out. This usually happens with large or complex files. Try converting to images instead."
  } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your connection and try again."
  }

  return errorMessage
}

/**
 * Get button text based on mode and format
 */
export function getProcessButtonText(
  tabMode: TabMode,
  outputFormat: OutputFormat,
  conversionMode: ConversionMode,
  fileCount: number
): string {
  if (tabMode === "convert") {
    const isBatch = conversionMode === "batch" && fileCount > 1

    if (outputFormat === "image") {
      return isBatch ? `Export ${fileCount} Files to Images` : "Export to Images"
    } else if (outputFormat === "powerpoint") {
      return isBatch ? `Convert ${fileCount} Files to PowerPoint` : "Convert to PowerPoint"
    } else if (outputFormat === "word") {
      return isBatch ? `Convert ${fileCount} Files to Word` : "Convert to Word"
    } else if (outputFormat === "excel") {
      return isBatch ? `Convert ${fileCount} Files to Excel` : "Convert to Excel"
    }
  } else if (tabMode === "compress") {
    return "Compress PDF"
  } else {
    return "Merge PDFs"
  }

  return "Process"
}

/**
 * Get completion message based on mode
 */
export function getCompletionMessage(tabMode: TabMode, outputFormat: OutputFormat): string {
  if (tabMode === "convert") {
    return outputFormat === "image" ? "Export Complete!" : "Conversion Complete!"
  } else if (tabMode === "compress") {
    return "Compression Complete!"
  } else {
    return "Merge Complete!"
  }
}
