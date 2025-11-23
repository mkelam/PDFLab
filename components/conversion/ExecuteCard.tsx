"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Download, Upload } from "lucide-react"
import { TabMode, OutputFormat, ConversionMode, getProcessButtonText, getCompletionMessage } from "@/lib/conversion/conversion-utils"
import { ProcessingState } from "@/hooks/useConversionProcessing"

interface ExecuteCardProps {
  activeTab: TabMode
  outputFormat: OutputFormat
  conversionMode: ConversionMode
  processing: ProcessingState
  uploadedFilesCount: number
  validFilesCount: number
  isGuest: boolean
  onProcess: () => void
  onDownload: () => void
  onReset: () => void
  onShowGuestPrompt: () => void
}

export function ExecuteCard({
  activeTab,
  outputFormat,
  conversionMode,
  processing,
  uploadedFilesCount,
  validFilesCount,
  isGuest,
  onProcess,
  onDownload,
  onReset,
  onShowGuestPrompt,
}: ExecuteCardProps) {
  const buttonText = getProcessButtonText(activeTab, outputFormat, conversionMode, uploadedFilesCount)
  const completionMessage = getCompletionMessage(activeTab, outputFormat)

  const isProcessButtonDisabled =
    validFilesCount === 0 || (activeTab === "merge" && validFilesCount < 2)

  return (
    <Card className="glass w-full lg:flex-1 lg:max-w-[420px]">
      <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
        <div className="text-center border-b border-primary/20 pb-2 mb-2">
          <h3 className="text-primary font-semibold text-sm lg:text-base">Step 3</h3>
        </div>

        {/* Processing */}
        <div className="flex-1 flex flex-col">
          <h4 className="text-primary/90 text-xs font-semibold mb-2">5. Processing</h4>
          <div className="flex-1 flex flex-col justify-center">
            {processing.isProcessing ? (
              <div className="text-center space-y-3">
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
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
                {uploadedFilesCount > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm">Ready to process files</p>
                    <Button
                      onClick={onProcess}
                      disabled={isProcessButtonDisabled}
                      data-testid="process-files-button"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {buttonText}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm">Upload files to start processing</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Download Ready */}
        <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
          <h4 className="text-primary/90 text-xs font-semibold mb-2">6. Download Ready</h4>
          <div className="flex-1 flex flex-col justify-center">
            {processing.result ? (
              <div className="text-center space-y-3">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                <div>
                  <h4 className="font-semibold text-green-700 text-sm">{completionMessage}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{processing.result.message}</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Processing time: {processing.result.processingTime}</p>
                  {processing.result.outputFile === "batch" && processing.batchJobIds ? (
                    <p>Output: {processing.batchJobIds.length} files ready as ZIP</p>
                  ) : (
                    <p>Output: {processing.result.outputFile}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      if (isGuest) {
                        onShowGuestPrompt()
                      } else {
                        onDownload()
                      }
                    }}
                    data-testid="download-button"
                    className="bg-green-600 hover:bg-green-700 text-xs px-3 py-2"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {processing.result.outputFile === "batch" ? "Download ZIP" : "Download"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onReset}
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
  )
}
