import { useState, useCallback } from "react"
import { validatePDFFile } from "@/lib/api"

export interface UploadedFile {
  file: File
  id: string
  valid: boolean
  error?: string
}

interface UseFileUploadOptions {
  maxFiles: number
  onFilesChange?: (files: UploadedFile[]) => void
}

export function useFileUpload({ maxFiles, onFilesChange }: UseFileUploadOptions) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const addFiles = useCallback(
    (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => {
        const validation = validatePDFFile(file)
        return {
          file,
          id: Math.random().toString(36).substr(2, 9),
          valid: validation.valid,
          error: validation.error,
        }
      })

      setUploadedFiles((prev) => {
        const updated = [...prev, ...newFiles].slice(0, maxFiles)
        onFilesChange?.(updated)
        return updated
      })
    },
    [maxFiles, onFilesChange]
  )

  const replaceFiles = useCallback(
    (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((file) => {
        const validation = validatePDFFile(file)
        return {
          file,
          id: Math.random().toString(36).substr(2, 9),
          valid: validation.valid,
          error: validation.error,
        }
      })

      setUploadedFiles(newFiles.slice(0, maxFiles))
      onFilesChange?.(newFiles.slice(0, maxFiles))
    },
    [maxFiles, onFilesChange]
  )

  const removeFile = useCallback(
    (id: string) => {
      setUploadedFiles((prev) => {
        const updated = prev.filter((f) => f.id !== id)
        onFilesChange?.(updated)
        return updated
      })
    },
    [onFilesChange]
  )

  const clearFiles = useCallback(() => {
    setUploadedFiles([])
    onFilesChange?.([])
  }, [onFilesChange])

  const validFiles = uploadedFiles.filter((f) => f.valid)
  const hasValidFiles = validFiles.length > 0

  return {
    uploadedFiles,
    validFiles,
    hasValidFiles,
    addFiles,
    replaceFiles,
    removeFile,
    clearFiles,
  }
}
