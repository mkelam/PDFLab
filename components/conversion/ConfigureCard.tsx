"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, CheckCircle, AlertCircle, X, Presentation, FileSpreadsheet, Image as ImageIcon, FileType } from "lucide-react"
import { TabMode, OutputFormat, CompressionLevel } from "@/lib/conversion/conversion-utils"
import { UploadedFile } from "@/hooks/useFileUpload"
import { formatFileSize } from "@/lib/api"

interface ConfigureCardProps {
  activeTab: TabMode
  outputFormat: OutputFormat
  compressionLevel: CompressionLevel
  uploadedFiles: UploadedFile[]
  isProcessing: boolean
  onOutputFormatChange: (format: OutputFormat) => void
  onCompressionLevelChange: (level: CompressionLevel) => void
  onRemoveFile: (id: string) => void
}

export function ConfigureCard({
  activeTab,
  outputFormat,
  compressionLevel,
  uploadedFiles,
  isProcessing,
  onOutputFormatChange,
  onCompressionLevelChange,
  onRemoveFile,
}: ConfigureCardProps) {
  return (
    <Card id="tour-format-selection" className="glass w-full lg:flex-1 lg:max-w-[350px]">
      <CardContent className="px-3 lg:px-4 py-2 lg:py-3 flex flex-col min-h-[160px] lg:min-h-[191px] gap-1">
        <div className="text-center border-b border-primary/20 pb-2 mb-2">
          <h3 className="text-primary font-semibold text-sm lg:text-base">Step 2</h3>
        </div>

        {/* Select Output / Compression Level */}
        <div className="flex-1 flex flex-col">
          <h4 className="text-primary/90 text-xs font-semibold mb-2">
            {activeTab === "compress" ? "3. Compression Level" : "3. Select Output"}
          </h4>
          <div className="flex flex-col justify-center flex-1 space-y-2">
            {activeTab === "merge" ? (
              <div className="text-center py-4 text-muted-foreground text-sm">PDF output format</div>
            ) : activeTab === "compress" ? (
              <div className="flex flex-col gap-2">
                {(["good", "recommended", "extreme"] as CompressionLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => onCompressionLevelChange(level)}
                    data-testid={`compression-level-${level}`}
                    className={`
                      p-3 rounded-lg border transition-all duration-200 flex flex-col items-start gap-1
                      ${
                        compressionLevel === level
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
                  const IconComponent =
                    format === "image"
                      ? ImageIcon
                      : format === "powerpoint"
                      ? Presentation
                      : format === "word"
                      ? FileType
                      : FileSpreadsheet

                  return (
                    <button
                      key={format}
                      onClick={() => onOutputFormatChange(format)}
                      data-testid={`output-format-option-${format}`}
                      className={`
                        p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 hover:scale-105
                        ${
                          outputFormat === format
                            ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20"
                            : "bg-muted/20 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/10"
                        }
                      `}
                    >
                      <IconComponent
                        className={`${outputFormat === format ? "w-10 h-10" : "w-8 h-8"} ${
                          outputFormat === format ? "text-primary" : "text-muted-foreground"
                        } transition-all duration-200`}
                      />
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`font-semibold transition-all duration-200 ${
                            outputFormat === format ? "text-base" : "text-sm"
                          }`}
                        >
                          {format === "image" && "Images"}
                          {format === "powerpoint" && "PowerPoint"}
                          {format === "word" && "Word"}
                          {format === "excel" && "Excel"}
                        </span>
                        <span
                          className={`text-center leading-tight transition-all duration-200 ${
                            outputFormat === format ? "text-xs opacity-90" : "text-[11px] opacity-80"
                          }`}
                        >
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

        {/* Files Ready */}
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
                      onClick={() => onRemoveFile(fileItem.id)}
                      disabled={isProcessing}
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
  )
}
