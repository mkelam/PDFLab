# Error Handling Documentation

This document outlines the error handling strategy, error boundaries, and logging practices for the PDFLab application.

## Table of Contents

- [Overview](#overview)
- [Error Boundaries](#error-boundaries)
- [Error Types](#error-types)
- [Error Logging](#error-logging)
- [User-Facing Errors](#user-facing-errors)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

PDFLab implements a multi-layered error handling strategy:

1. **React Error Boundaries** - Catch React component errors
2. **Next.js Error Pages** - Handle route-level errors
3. **Global Error Handler** - Catch critical application errors
4. **API Error Handling** - Backend error responses
5. **Monitoring Integration** - Sentry for production error tracking

## Error Boundaries

### ErrorBoundary Component

Location: `components/ErrorBoundary.tsx`

A reusable React Error Boundary that catches JavaScript errors anywhere in the child component tree.

**Features**:
- Catches errors during rendering, lifecycle methods, and constructors
- Displays fallback UI when errors occur
- Logs errors to console (and monitoring services)
- Shows error details in development mode
- Provides "Reload" and "Go Home" recovery options

**Usage**:

```tsx
import ErrorBoundary from '@/components/ErrorBoundary'

function MyApp() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

**Custom Fallback**:

```tsx
<ErrorBoundary
  fallback={
    <div>Custom error message</div>
  }
>
  <MyComponent />
</ErrorBoundary>
```

**Error Handler Callback**:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Send to monitoring service
    console.error('Custom error handler:', error, errorInfo)
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Root Error Handler (app/error.tsx)

Handles errors at the route segment level.

**Features**:
- Catches errors in page components
- Provides "Try Again" functionality via reset()
- Shows error details in development
- Maintains application chrome (no full page replacement)

**Usage**: Automatically used by Next.js for route-level errors

### Global Error Handler (app/global-error.tsx)

Handles critical errors that occur outside the main application tree.

**Features**:
- Catches errors in root layout
- Replaces entire application with error UI
- Highest level error boundary
- Only triggered for catastrophic failures

**Usage**: Automatically used by Next.js for global errors

## Error Types

### 1. Client-Side Errors

**React Component Errors**:
- Rendering errors
- Event handler errors
- useEffect errors

**Caught by**: ErrorBoundary component

**Example**:
```tsx
function MyComponent() {
  if (someCondition) {
    throw new Error('Component error')
  }
  return <div>Content</div>
}
```

### 2. API Errors

**Network Errors**:
- Failed fetch requests
- Timeout errors
- Connection refused

**Caught by**: API client error handling (lib/api.ts)

**Example**:
```typescript
try {
  const response = await api.get('/endpoint')
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('API Error:', error.response.data)
  } else if (error.request) {
    // Request made but no response
    console.error('Network Error:', error.message)
  } else {
    // Something else happened
    console.error('Error:', error.message)
  }
}
```

### 3. Authentication Errors

**Auth Failures**:
- Invalid credentials (401)
- Expired tokens (403)
- Missing authentication

**Caught by**: AuthContext and auth middleware

**Example**:
```typescript
// Automatic token refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Try to refresh token
      await refreshToken()
      return api.request(error.config)
    }
    return Promise.reject(error)
  }
)
```

### 4. Validation Errors

**Form Validation**:
- Invalid input
- Missing required fields
- Format errors

**Caught by**: Form validation libraries (react-hook-form, zod)

**Example**:
```typescript
const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

try {
  schema.parse(formData)
} catch (error) {
  // Display validation errors to user
  console.error('Validation errors:', error.errors)
}
```

### 5. File Upload Errors

**Upload Failures**:
- File too large
- Invalid file type
- Upload interrupted

**Caught by**: Upload middleware and handlers

**Example**:
```typescript
if (file.size > MAX_FILE_SIZE) {
  throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
}
```

## Error Logging

### Development vs Production

**Development Mode** (`NODE_ENV === 'development'`):
- Full error details displayed in UI
- Stack traces shown in error boundaries
- Console logging enabled
- No external logging

**Production Mode** (`NODE_ENV === 'production'`):
- User-friendly error messages only
- No stack traces in UI
- Errors logged to monitoring service (Sentry)
- Sanitized error details

### Console Logging

**Error Boundary Logging**:
```typescript
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error('ErrorBoundary caught error:', error, errorInfo)

  // Log to monitoring service
  if (typeof Sentry !== 'undefined' && process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    })
  }
}
```

### Sentry Integration

**Setup** (already configured):
- Backend: `@sentry/node` with Express integration
- Frontend: `@sentry/nextjs` (when implemented)
- Error sampling: 100% in production
- Performance monitoring: 10% sample rate

**Custom Error Tracking**:
```typescript
import * as Sentry from '@sentry/node'

try {
  // Risky operation
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'pdf-conversion',
      user_plan: user.plan
    },
    extra: {
      jobId: job.id,
      fileSize: file.size
    }
  })
}
```

## User-Facing Errors

### Error Message Guidelines

**DO**:
- Be clear and concise
- Explain what went wrong
- Suggest how to fix it
- Provide contact support option

**DON'T**:
- Show technical jargon
- Expose stack traces in production
- Blame the user
- Leave user stranded without options

### Error Message Examples

**Good**:
```
"Your file is too large (15MB). Please upload a file smaller than 10MB or upgrade to a Pro plan for larger files."
```

**Bad**:
```
"Error: MAX_FILE_SIZE_EXCEEDED at uploadHandler.ts:42"
```

### Toast Notifications

For non-critical errors, use toast notifications:

```typescript
import { toast } from '@/components/ui/use-toast'

toast({
  variant: 'destructive',
  title: 'Upload Failed',
  description: 'Please try again or contact support if the problem persists.',
})
```

### Error States in UI

**Loading States**:
```tsx
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage message={error.message} />}
{data && <DataDisplay data={data} />}
```

**Retry Mechanisms**:
```tsx
<Button
  onClick={handleRetry}
  disabled={isRetrying}
>
  {isRetrying ? 'Retrying...' : 'Try Again'}
</Button>
```

## Best Practices

### 1. Graceful Degradation

Always provide fallback behavior:

```typescript
try {
  const data = await fetchData()
  return <DataView data={data} />
} catch (error) {
  // Fallback to cached data or default state
  return <FallbackView />
}
```

### 2. Error Recovery

Implement retry logic for transient failures:

```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url)
    } catch (error) {
      if (i === retries - 1) throw error
      await delay(1000 * (i + 1)) // Exponential backoff
    }
  }
}
```

### 3. User Context

Include relevant context in error logs:

```typescript
logger.error('Conversion failed', {
  userId: user.id,
  jobId: job.id,
  fileSize: file.size,
  conversionType: job.type,
  errorMessage: error.message
})
```

### 4. Prevent Error Propagation

Catch errors at the lowest level possible:

```typescript
// Good - catch at component level
function Component() {
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData().catch(setError)
  }, [])

  if (error) return <ErrorDisplay error={error} />
  return <div>Content</div>
}
```

### 5. Async Error Handling

Always handle promise rejections:

```typescript
// Good
async function handleSubmit() {
  try {
    await submitForm()
  } catch (error) {
    handleError(error)
  }
}

// Bad - unhandled rejection
async function handleSubmit() {
  submitForm() // Missing await and try/catch
}
```

## Troubleshooting

### Common Issues

**Error Boundary Not Catching Errors**:

Error boundaries do NOT catch:
- Event handlers (use try/catch)
- Async code (use try/catch)
- Server-side rendering errors
- Errors in the error boundary itself

**Solution**: Use try/catch for these cases:
```typescript
async function handleClick() {
  try {
    await asyncOperation()
  } catch (error) {
    setError(error)
  }
}
```

**Infinite Error Loops**:

If error boundary keeps triggering:
- Check for errors in fallback UI
- Ensure error boundary isn't nested incorrectly
- Look for state updates in componentDidCatch

**Error Not Logged to Sentry**:

Check:
- Sentry DSN is configured
- Sentry is initialized before app render
- Error is actually thrown (not just logged)
- Network connection to Sentry

## Error Monitoring Checklist

### Development
- [ ] All error boundaries in place
- [ ] Console logging for debugging
- [ ] Error details shown in UI (dev mode)
- [ ] Test error scenarios manually

### Staging
- [ ] Sentry configured and tested
- [ ] Error logs being captured
- [ ] User-friendly error messages
- [ ] Recovery mechanisms tested

### Production
- [ ] Sentry monitoring active
- [ ] Error rate alerts configured
- [ ] No stack traces in UI
- [ ] Support contact available in error messages

## Resources

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Sentry Documentation](https://docs.sentry.io/)
- [JavaScript Error Handling Best Practices](https://www.sitepoint.com/javascript-error-handling/)

## Next Steps

1. Implement frontend Sentry integration (@sentry/nextjs)
2. Add custom error pages for common HTTP errors (404, 500)
3. Create error reporting dashboard for admins
4. Implement error rate alerting (Slack/Email)
5. Add user-initiated error reporting ("Report a Bug" button)

---

**Last Updated**: 2025-11-23
**Maintained By**: PDFLab Development Team
