'use client'

import React, { useState, useEffect } from 'react'
import Joyride, { CallBackProps, Step, STATUS, EVENTS } from 'react-joyride'
import { useOnboarding } from '@/contexts/OnboardingContext'

/**
 * ProductTour Component
 *
 * Interactive 5-step guided tour for new users
 * Uses react-joyride for overlay tooltips
 * Tracks progress via OnboardingContext
 */

const ProductTour: React.FC = () => {
  const { progress, updateProgress } = useOnboarding()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  // Define tour steps
  const steps: Step[] = [
    {
      target: '#upload-area',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Welcome to PDFLab!</h3>
          <p>Let's take a quick tour. First, this is where you upload your PDF files for conversion.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
      spotlightClicks: false,
    },
    {
      target: '#conversion-formats',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Choose Your Format</h3>
          <p>Select from 4 conversion formats: PowerPoint, Word, Excel, or PNG images.</p>
        </div>
      ),
      placement: 'bottom',
      spotlightClicks: false,
    },
    {
      target: 'nav a[href="/dashboard"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Track Your Conversions</h3>
          <p>Visit your dashboard to see conversion history, download files, and manage your account.</p>
        </div>
      ),
      placement: 'bottom',
      spotlightClicks: false,
    },
    {
      target: 'nav a[href="/pricing"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Upgrade Anytime</h3>
          <p>Need more conversions or larger files? Check out our pricing plans for unlimited access.</p>
        </div>
      ),
      placement: 'bottom',
      spotlightClicks: false,
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">You're All Set! 🎉</h3>
          <p className="mb-3">Ready to convert your first PDF? Try uploading a file now, or use one of our sample templates.</p>
          <p className="text-sm text-gray-600">Tip: Drag and drop works too!</p>
        </div>
      ),
      placement: 'center',
      spotlightClicks: false,
    },
  ]

  // Start tour when component mounts and tour is not completed
  useEffect(() => {
    if (progress && !progress.tour_completed) {
      // Start tour after a short delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setStepIndex(progress.tour_step_completed || 0)
        setRun(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [progress])

  // Handle tour callback events
  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, type, index, action } = data

    // User closed or skipped the tour
    if (status === STATUS.SKIPPED || action === 'close') {
      setRun(false)
      await updateProgress({ tour_completed: false })
      return
    }

    // Tour finished successfully
    if (status === STATUS.FINISHED) {
      setRun(false)
      await updateProgress({
        tour_completed: true,
        tour_step_completed: steps.length,
      })
      return
    }

    // Step changed - update progress
    if (type === EVENTS.STEP_AFTER) {
      const nextStep = index + 1
      await updateProgress({
        tour_step_completed: nextStep,
      })
      setStepIndex(nextStep)
    }
  }

  // Don't render if tour is already completed
  if (!progress || progress.tour_completed) {
    return null
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'oklch(0.72 0.15 250)', // PDFLab primary purple
          textColor: 'oklch(0.15 0.01 250)',
          backgroundColor: 'white',
          arrowColor: 'white',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontSize: '15px',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px',
        },
        buttonNext: {
          backgroundColor: 'oklch(0.72 0.15 250)',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 500,
        },
        buttonBack: {
          color: 'oklch(0.72 0.15 250)',
          marginRight: '10px',
        },
        buttonSkip: {
          color: 'oklch(0.5 0.01 250)',
          fontSize: '14px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  )
}

export default ProductTour
