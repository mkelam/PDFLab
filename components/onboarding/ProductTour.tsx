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

  // Define tour steps with proper selectors
  const steps: Step[] = [
    {
      target: '#tour-upload-area',
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
      target: '#tour-format-selection',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Choose Your Format</h3>
          <p>Select from 4 conversion formats: PowerPoint, Word, Excel, or PNG images.</p>
        </div>
      ),
      placement: 'top',
      spotlightClicks: false,
    },
    {
      target: '#tour-execute-area',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Process & Download</h3>
          <p>Click the convert button to start processing. Once complete, download your converted file here.</p>
        </div>
      ),
      placement: 'top',
      spotlightClicks: false,
    },
    {
      target: '#tour-dashboard-link',
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
      target: '#tour-pricing-link',
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
          <p className="text-sm opacity-70">Tip: Drag and drop works too!</p>
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
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data

    // User closed or skipped the tour
    if (status === STATUS.SKIPPED || action === 'close') {
      setRun(false)
      // Fire and forget - don't await to avoid re-render issues
      updateProgress({ tour_completed: false }).catch(console.error)
      return
    }

    // Tour finished successfully
    if (status === STATUS.FINISHED) {
      setRun(false)
      // Fire and forget - don't await to avoid re-render issues
      updateProgress({
        tour_completed: true,
        tour_step_completed: steps.length,
      }).catch(console.error)
      return
    }

    // Step changed - update step index for controlled navigation
    if (type === EVENTS.STEP_AFTER && action === 'next') {
      setStepIndex(index + 1)
    } else if (type === EVENTS.STEP_AFTER && action === 'prev') {
      setStepIndex(index - 1)
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
          primaryColor: '#2dd4bf', // Teal-400 for buttons
          textColor: '#f5f5f5',
          backgroundColor: '#1a1a1a', // Dark card background
          arrowColor: '#1a1a1a',
          overlayColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontSize: '15px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px',
          color: '#f5f5f5',
        },
        tooltipContent: {
          color: '#a3a3a3',
        },
        buttonNext: {
          backgroundColor: '#2dd4bf',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#0a0a0a',
        },
        buttonBack: {
          color: '#2dd4bf',
          marginRight: '10px',
        },
        buttonSkip: {
          color: '#737373',
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
