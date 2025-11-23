"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { OutputFormat } from "@/lib/conversion/conversion-utils"

interface ConversionErrorDisplayProps {
  error: string
  onRetry: () => void
  onReset: () => void
  onSwitchToImages: () => void
  onSwitchToWord: () => void
  onSwitchToPowerPoint: () => void
}

export function ConversionErrorDisplay({
  error,
  onRetry,
  onReset,
  onSwitchToImages,
  onSwitchToWord,
  onSwitchToPowerPoint,
}: ConversionErrorDisplayProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <Alert className="border-red-200" data-testid="conversion-error-message">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-700">
          <div className="flex flex-col gap-3">
            <span>{error}</span>
            <div className="flex flex-wrap gap-2">
              {/* File too large error */}
              {error.includes("File too large") && (
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
                    onClick={onReset}
                    size="sm"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-50"
                  >
                    Try Different File
                  </Button>
                </>
              )}

              {/* Corrupted file error */}
              {error.includes("corrupted") && (
                <>
                  <Button
                    onClick={onReset}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Upload Different File
                  </Button>
                  <Button
                    onClick={() =>
                      window.open("mailto:support@pdflab.pro?subject=Corrupted PDF Help", "_blank")
                    }
                    size="sm"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-50"
                  >
                    Contact Support
                  </Button>
                </>
              )}

              {/* Timeout error */}
              {error.includes("timed out") && (
                <>
                  <Button
                    onClick={onSwitchToImages}
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    data-testid="try-images-button"
                  >
                    Try Converting to Images
                  </Button>
                  <Button
                    onClick={onRetry}
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
              {error.includes("XLSX") && error.includes("table data") && (
                <>
                  <Button
                    onClick={onSwitchToWord}
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    Try Word Instead
                  </Button>
                  <Button
                    onClick={onSwitchToPowerPoint}
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    Try PowerPoint Instead
                  </Button>
                  <Button
                    onClick={onReset}
                    size="sm"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-50"
                  >
                    Upload Different File
                  </Button>
                </>
              )}

              {/* Network error or generic error */}
              {(error.includes("Network") ||
                (!error.includes("File too large") &&
                  !error.includes("corrupted") &&
                  !error.includes("timed out") &&
                  !error.includes("XLSX"))) && (
                <>
                  <Button
                    onClick={onRetry}
                    data-testid="retry-conversion-button"
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={onReset}
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
  )
}
