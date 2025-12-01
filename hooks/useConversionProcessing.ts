import { useState, useCallback, useRef } from "react"
import { ConversionResponse } from "@/lib/api"

export interface ProcessingState {
  isProcessing: boolean
  progress: number
  stage: string
  timeRemaining?: string
  result?: ConversionResponse
  error?: string
  isGuest?: boolean
  batchJobIds?: string[]
}

interface ProgressStage {
  progress: number
  stage: string
  timeRemaining: string
}

export function useConversionProcessing() {
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: "",
  })

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const startProcessing = useCallback((initialStage: string) => {
    setProcessing({
      isProcessing: true,
      progress: 0,
      stage: initialStage,
    })
  }, [])

  const updateProgress = useCallback((progress: number, stage: string, timeRemaining?: string) => {
    setProcessing((prev) => ({
      ...prev,
      progress,
      stage,
      timeRemaining,
    }))
  }, [])

  const startProgressAnimation = useCallback((stages: ProgressStage[]) => {
    let currentStage = 0

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
    }

    // Immediately set isProcessing to true and show first stage
    const firstStage = stages[0]
    setProcessing({
      isProcessing: true,
      progress: firstStage?.progress || 0,
      stage: firstStage?.stage || "Processing...",
      timeRemaining: firstStage?.timeRemaining,
    })
    currentStage = 1

    progressTimerRef.current = setInterval(() => {
      if (currentStage < stages.length) {
        const currentStageData = stages[currentStage]
        if (currentStageData) {
          setProcessing((prev) => ({
            ...prev,
            progress: currentStageData.progress,
            stage: currentStageData.stage,
            timeRemaining: currentStageData.timeRemaining,
          }))
          currentStage++
        }
      } else {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current)
          progressTimerRef.current = null
        }
      }
    }, 800)
  }, [])

  const completeProcessing = useCallback((result: ConversionResponse, batchJobIds?: string[]) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    setProcessing({
      isProcessing: false,
      progress: 100,
      stage: "Complete!",
      result,
      isGuest: result.isGuest,
      batchJobIds,
    })
  }, [])

  const setError = useCallback((errorMessage: string) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    setProcessing({
      isProcessing: false,
      progress: 0,
      stage: "",
      error: errorMessage,
    })
  }, [])

  const reset = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    setProcessing({
      isProcessing: false,
      progress: 0,
      stage: "",
      error: undefined,
      result: undefined,
      timeRemaining: undefined,
    })
  }, [])

  return {
    processing,
    startProcessing,
    updateProgress,
    startProgressAnimation,
    completeProcessing,
    setError,
    reset,
  }
}
