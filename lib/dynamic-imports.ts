/**
 * Dynamic Imports for Bundle Optimization
 *
 * This file contains dynamically imported components to reduce initial bundle size.
 * Components are loaded only when needed, improving initial page load performance.
 */

import dynamic from 'next/dynamic'
import React from 'react'

// =============================================================================
// ADMIN COMPONENTS (Heavy - only load when accessing admin pages)
// =============================================================================

export const AdminLayout = dynamic(() => import('@/components/admin/AdminLayout').then(mod => ({ default: mod.AdminLayout })), {
  loading: () => React.createElement('div', null, 'Loading admin...'),
  ssr: true,
})

export const UserDetailModal = dynamic(() => import('@/components/admin/UserDetailModal').then(mod => mod.UserDetailModal), {
  loading: () => React.createElement('div', null, 'Loading...'),
  ssr: false,
})

export const SubscriptionDetailModal = dynamic(() => import('@/components/admin/SubscriptionDetailModal').then(mod => mod.SubscriptionDetailModal), {
  loading: () => React.createElement('div', null, 'Loading...'),
  ssr: false,
})

export const TransactionDetailModal = dynamic(() => import('@/components/admin/TransactionDetailModal').then(mod => mod.TransactionDetailModal), {
  loading: () => React.createElement('div', null, 'Loading...'),
  ssr: false,
})

export const AuditLogDetailModal = dynamic(() => import('@/components/admin/AuditLogDetailModal').then(mod => mod.AuditLogDetailModal), {
  loading: () => React.createElement('div', null, 'Loading...'),
  ssr: false,
})

export const ConversionJobDetailModal = dynamic(() => import('@/components/admin/ConversionJobDetailModal').then(mod => mod.ConversionJobDetailModal), {
  loading: () => React.createElement('div', null, 'Loading...'),
  ssr: false,
})

// =============================================================================
// ONBOARDING COMPONENTS (Heavy - only load for new users)
// =============================================================================

export const ProductTour = dynamic(() => import('@/components/onboarding/ProductTour'), {
  loading: () => React.createElement('div', null, 'Loading tour...'),
  ssr: false, // Client-side only
})

export const QuickStartWizard = dynamic(() => import('@/components/onboarding/QuickStartWizard'), {
  loading: () => React.createElement('div', null, 'Loading wizard...'),
  ssr: false, // Client-side only
})

export const SampleTemplates = dynamic(() => import('@/components/onboarding/SampleTemplates'), {
  loading: () => React.createElement('div', null, 'Loading templates...'),
  ssr: false,
})

// =============================================================================
// PDF CONVERSION COMPONENTS (Heavy - load on demand)
// =============================================================================

export const UnifiedConversionInterface = dynamic(() => import('@/components/UnifiedConversionInterface').then(mod => mod.UnifiedConversionInterface), {
  loading: () => React.createElement('div', { className: 'flex items-center justify-center py-12' },
    React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary' })
  ),
  ssr: false, // Client-side only for file handling
})

export const PDFUpload = dynamic(() => import('@/components/PDFUpload').then(mod => mod.PDFUpload), {
  loading: () => React.createElement('div', { className: 'flex items-center justify-center py-12' },
    React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary' })
  ),
  ssr: false,
})

// =============================================================================
// FEEDBACK AND BETA COMPONENTS (Not critical for initial load)
// =============================================================================

export const FeedbackBubble = dynamic(() => import('@/components/FeedbackBubble'), {
  loading: () => null, // No loading UI needed
  ssr: false,
})

export const BetaExpirationTimer = dynamic(() => import('@/components/BetaExpirationTimer').then(mod => mod.BetaExpirationTimer), {
  loading: () => null,
  ssr: false,
})

// =============================================================================
// CAROUSEL COMPONENTS (Heavy due to embla-carousel dependency)
// =============================================================================

export const TestimonialsCarousel = dynamic(() => import('@/components/TestimonialsCarousel').then(mod => mod.TestimonialsCarousel), {
  loading: () => React.createElement('div', { className: 'h-64 animate-pulse bg-gray-100 rounded-lg' }),
  ssr: true, // Can be SSR for SEO
})
