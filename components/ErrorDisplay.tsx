'use client'

import React from 'react'
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react'

/**
 * Enhanced Error Display Component
 * Supports the new rich error structures from backend UX improvements
 */

export interface ErrorOption {
  id: string
  title: string
  description?: string
  cta?: string
  url?: string
  primary?: boolean
  steps?: string[]
}

export interface ErrorCTA {
  text: string
  url: string
}

export interface EnhancedError {
  error: string
  message: string
  error_id?: string
  support_message?: string
  timestamp?: string

  // Rich error data
  options?: ErrorOption[]
  cta?: ErrorCTA
  unlock_benefits?: string[]
  alternative?: string
  upgrade_options?: any[]
  tip?: string

  // Additional context
  [key: string]: any
}

interface ErrorDisplayProps {
  error: EnhancedError | string
  onClose?: () => void
  onAction?: (action: string, url?: string) => void
}

export function ErrorDisplay({ error, onClose, onAction }: ErrorDisplayProps) {
  // Convert string error to object
  const errorData: EnhancedError = typeof error === 'string'
    ? { error: 'Error', message: error }
    : error

  const handleAction = (action: string, url?: string) => {
    if (onAction) {
      onAction(action, url)
    } else if (url) {
      window.location.href = url
    }
    if (onClose) {
      onClose()
    }
  }

  // Render Premium Format Error (403)
  if (errorData.error === 'Premium format' && errorData.unlock_benefits) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <span className="text-2xl">🎁</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-1">
                {errorData.error}
              </h3>
              <p className="text-gray-300">
                {errorData.message}
              </p>
            </div>
          </div>

          {errorData.unlock_benefits && (
            <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm font-medium text-gray-300 mb-3">
                Sign up to unlock:
              </p>
              <ul className="space-y-2">
                {errorData.unlock_benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-200">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorData.cta && (
            <button
              onClick={() => handleAction('signup', errorData.cta!.url)}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl mb-3"
            >
              {errorData.cta.text}
            </button>
          )}

          {errorData.alternative && (
            <p className="text-sm text-center text-gray-400">
              {errorData.alternative}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Render Guest Quota Error (429 - Daily limit reached)
  if (errorData.error === 'Daily limit reached' && errorData.options) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="text-center mb-6">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {errorData.message}
            </h3>
            {errorData.hoursUntilReset && (
              <p className="text-sm text-gray-400">
                Reset in {errorData.hoursUntilReset} hour{errorData.hoursUntilReset !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {errorData.options.map((option) => (
              <div
                key={option.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  option.primary
                    ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/50 hover:border-purple-500'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                onClick={() => option.cta && handleAction(option.id, option.url)}
              >
                <h4 className="font-medium text-white mb-1">{option.title}</h4>
                <p className="text-sm text-gray-400 mb-3">{option.description}</p>
                {option.cta && (
                  <button
                    className={`text-sm font-medium ${
                      option.primary ? 'text-purple-400' : 'text-gray-400'
                    }`}
                  >
                    {option.cta} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render File Size Error (413) with upgrade options
  if (errorData.error === 'File too large' && errorData.upgrade_options) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start gap-4 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                {errorData.error}
              </h3>
              <p className="text-gray-300">{errorData.message}</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {errorData.upgrade_options.map((option: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  option.highlight
                    ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                onClick={() => handleAction(`upgrade-${option.plan}`, option.url)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white capitalize">{option.plan}</h4>
                    <p className="text-sm text-gray-400">{option.limit} files</p>
                  </div>
                  {option.price && (
                    <span className="text-sm font-medium text-purple-400">{option.price}</span>
                  )}
                </div>
                {option.cta && (
                  <button className="mt-2 text-sm text-purple-400 hover:text-purple-300">
                    {option.cta} →
                  </button>
                )}
              </div>
            ))}
          </div>

          {errorData.tip && (
            <p className="text-sm text-gray-400 text-center">{errorData.tip}</p>
          )}
        </div>
      </div>
    )
  }

  // Render File Expired Error (410) with recovery options
  if (errorData.error === 'File expired' && errorData.options) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="text-center mb-4">
            <Info className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {errorData.error}
            </h3>
            <p className="text-gray-300">{errorData.message}</p>
            {errorData.retention_period && (
              <p className="text-sm text-gray-400 mt-2">
                Retention period: {errorData.retention_period}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {errorData.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAction(option.id, option.url)}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  option.primary
                    ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/50 hover:border-purple-500'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <h4 className="font-medium text-white mb-1">{option.title}</h4>
                <p className="text-sm text-gray-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render Cookie Error (401) with steps
  if (errorData.error === 'Authentication required' && errorData.options) {
    const cookieOption = errorData.options.find(opt => opt.steps)

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">
              {errorData.error}
            </h3>
            <p className="text-gray-300">{errorData.message}</p>
          </div>

          {cookieOption && cookieOption.steps && (
            <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-medium text-white mb-3">{cookieOption.title}</h4>
              <p className="text-sm text-gray-400 mb-3">{cookieOption.description}</p>
              <ol className="space-y-2">
                {cookieOption.steps.map((step, index) => (
                  <li key={index} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-purple-400 font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex gap-3">
            {errorData.options
              .filter(opt => opt.cta)
              .map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAction(option.id, option.url)}
                  className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  {option.cta}
                </button>
              ))}
          </div>
        </div>
      </div>
    )
  }

  // Render Server Error (500) with error ID
  if (errorData.error_id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-red-500/20 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start gap-4 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                Something went wrong
              </h3>
              <p className="text-gray-300">{errorData.message}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <p className="text-sm text-gray-400 mb-2">Error ID for support:</p>
            <code className="text-sm font-mono text-red-400 bg-black/20 px-2 py-1 rounded">
              {errorData.error_id}
            </code>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Generic error fallback
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-start gap-4 mb-4">
          <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">
              {errorData.error}
            </h3>
            <p className="text-gray-300">{errorData.message}</p>
          </div>
        </div>

        {errorData.cta && (
          <button
            onClick={() => handleAction('cta', errorData.cta!.url)}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors mb-3"
          >
            {errorData.cta.text}
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
