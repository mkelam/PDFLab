"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload } from "lucide-react"
import { DropzoneRootProps, DropzoneInputProps } from "react-dropzone"
import { TabMode, ConversionMode, getUploadText } from "@/lib/conversion/conversion-utils"

interface SetupCardProps {
  activeTab: TabMode
  conversionMode: ConversionMode
  maxFiles: number
  isDragActive: boolean
  isProcessing: boolean
  onTabChange: (tab: TabMode) => void
  onConversionModeChange: (mode: ConversionMode) => void
  getRootProps: () => DropzoneRootProps
  getInputProps: () => DropzoneInputProps
}

export function SetupCard({
  activeTab,
  conversionMode,
  maxFiles,
  isDragActive,
  isProcessing,
  onTabChange,
  onConversionModeChange,
  getRootProps,
  getInputProps,
}: SetupCardProps) {
  const uploadText = getUploadText(activeTab, conversionMode, maxFiles)

  return (
    <Card id="tour-upload-area" className="glass w-full lg:flex-1 lg:max-w-[400px]">
      <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
        <div className="text-center border-b border-primary/20 pb-2 mb-2">
          <h3 className="text-primary font-semibold text-sm lg:text-base">Step 1</h3>
        </div>

        {/* Choose Mode */}
        <div className="flex-1 flex flex-col">
          <h4 className="text-primary/90 text-xs font-semibold mb-2">1. Choose Mode</h4>
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <button
              onClick={() => onTabChange("convert")}
              data-testid="convert-mode-button"
              className={`
                p-3 rounded-lg text-center font-medium transition-all duration-300 border relative
                ${
                  activeTab === "convert"
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
              onClick={() => onTabChange("merge")}
              data-testid="merge-mode-button"
              className={`
                p-2 rounded-lg text-center font-medium transition-all duration-300 border
                ${
                  activeTab === "merge"
                    ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                }
              `}
            >
              Merge
            </button>
            <button
              onClick={() => onTabChange("compress")}
              data-testid="compress-mode-button"
              className={`
                p-2 rounded-lg text-center font-medium transition-all duration-300 border
                ${
                  activeTab === "compress"
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
                onClick={() => onConversionModeChange("single")}
                className={`
                  flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
                  ${
                    conversionMode === "single"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-primary"
                  }
                `}
              >
                Single File
              </button>
              <button
                onClick={() => onConversionModeChange("batch")}
                className={`
                  flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1
                  ${
                    conversionMode === "batch"
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

        {/* Drag and Drop */}
        <div className="flex-1 flex flex-col border-t border-primary/10 pt-4">
          <h4 className="text-primary/90 text-xs font-semibold mb-2">2. Drag and Drop</h4>
          <div
            {...getRootProps()}
            data-testid="file-upload-dropzone"
            className={`
              border-2 border-dashed rounded-lg p-6 lg:p-4 text-center cursor-pointer transition-all flex-1 flex flex-col justify-center min-h-[120px] lg:min-h-auto
              ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
              ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{uploadText.title}</p>
                <p className="text-xs text-muted-foreground">{uploadText.subtitle}</p>
              </div>
              {isDragActive && (
                <Badge className="bg-primary/20 text-primary text-xs">Drop files here</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              PDF files only • Free: 10MB max • Pro: 100MB
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
