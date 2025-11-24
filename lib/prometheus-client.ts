/**
 * Prometheus Query Client
 *
 * Client for querying Prometheus metrics API
 * Used by custom dashboard components
 */

export interface PrometheusQueryResult {
  status: 'success' | 'error'
  data: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string'
    result: Array<{
      metric: Record<string, string>
      value?: [number, string]
      values?: Array<[number, string]>
    }>
  }
  error?: string
  errorType?: string
}

export interface PrometheusRangeQueryOptions {
  query: string
  start: number | Date
  end: number | Date
  step?: string
}

export interface PrometheusInstantQueryOptions {
  query: string
  time?: number | Date
}

export class PrometheusClient {
  private baseUrl: string

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090') {
    this.baseUrl = baseUrl
  }

  /**
   * Execute instant query
   */
  async query(options: PrometheusInstantQueryOptions): Promise<PrometheusQueryResult> {
    const params = new URLSearchParams({
      query: options.query
    })

    if (options.time) {
      const timestamp = options.time instanceof Date ? options.time.getTime() / 1000 : options.time
      params.append('time', timestamp.toString())
    }

    const response = await fetch(`${this.baseUrl}/api/v1/query?${params}`)
    return response.json()
  }

  /**
   * Execute range query
   */
  async queryRange(options: PrometheusRangeQueryOptions): Promise<PrometheusQueryResult> {
    const start = options.start instanceof Date ? options.start.getTime() / 1000 : options.start
    const end = options.end instanceof Date ? options.end.getTime() / 1000 : options.end

    const params = new URLSearchParams({
      query: options.query,
      start: start.toString(),
      end: end.toString(),
      step: options.step || '15s'
    })

    const response = await fetch(`${this.baseUrl}/api/v1/query_range?${params}`)
    return response.json()
  }

  /**
   * Get current metric value
   */
  async getCurrentValue(metricName: string, labels?: Record<string, string>): Promise<number | null> {
    let query = metricName

    if (labels) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      query = `${metricName}{${labelStr}}`
    }

    const result = await this.query({ query })

    if (result.status === 'success' && result.data.result.length > 0) {
      const value = result.data.result[0].value
      return value ? parseFloat(value[1]) : null
    }

    return null
  }

  /**
   * Get metric over time range
   */
  async getMetricRange(
    metricName: string,
    startTime: Date,
    endTime: Date,
    labels?: Record<string, string>,
    step: string = '1m'
  ): Promise<Array<{ timestamp: number; value: number }>> {
    let query = metricName

    if (labels) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      query = `${metricName}{${labelStr}}`
    }

    const result = await this.queryRange({
      query,
      start: startTime,
      end: endTime,
      step
    })

    if (result.status === 'success' && result.data.result.length > 0) {
      const values = result.data.result[0].values || []
      return values.map(([timestamp, value]) => ({
        timestamp,
        value: parseFloat(value)
      }))
    }

    return []
  }

  /**
   * Calculate rate over time
   */
  async getRate(
    metricName: string,
    interval: string = '5m',
    labels?: Record<string, string>
  ): Promise<number | null> {
    let query = `rate(${metricName}`

    if (labels) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      query += `{${labelStr}}`
    }

    query += `[${interval}])`

    const result = await this.query({ query })

    if (result.status === 'success' && result.data.result.length > 0) {
      const value = result.data.result[0].value
      return value ? parseFloat(value[1]) : null
    }

    return null
  }

  /**
   * Get histogram quantile
   */
  async getQuantile(
    metricName: string,
    quantile: number,
    interval: string = '5m',
    labels?: Record<string, string>
  ): Promise<number | null> {
    let query = `histogram_quantile(${quantile}, sum by (le) (rate(${metricName}_bucket`

    if (labels) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      query += `{${labelStr}}`
    }

    query += `[${interval}])))`

    const result = await this.query({ query })

    if (result.status === 'success' && result.data.result.length > 0) {
      const value = result.data.result[0].value
      return value ? parseFloat(value[1]) : null
    }

    return null
  }

  /**
   * Get sum of metric
   */
  async getSum(metricName: string, labels?: Record<string, string>): Promise<number | null> {
    let query = `sum(${metricName}`

    if (labels) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      query += `{${labelStr}}`
    }

    query += ')'

    const result = await this.query({ query })

    if (result.status === 'success' && result.data.result.length > 0) {
      const value = result.data.result[0].value
      return value ? parseFloat(value[1]) : null
    }

    return null
  }

  /**
   * Get metric grouped by label
   */
  async getGroupedMetric(
    metricName: string,
    groupBy: string,
    labels?: Record<string, string>
  ): Promise<Array<{ label: string; value: number }>> {
    let query = `sum by (${groupBy}) (${metricName}`

    if (labels) {
      const labelStr = Object.entries(labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      query += `{${labelStr}}`
    }

    query += ')'

    const result = await this.query({ query })

    if (result.status === 'success') {
      return result.data.result.map(item => ({
        label: item.metric[groupBy] || 'unknown',
        value: item.value ? parseFloat(item.value[1]) : 0
      }))
    }

    return []
  }
}

// Singleton instance
export const prometheusClient = new PrometheusClient()

// ============================================================================
// Pre-built Query Functions for PDFLab Metrics
// ============================================================================

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(timeRange: '1h' | '24h' | '7d' = '24h') {
  const client = new PrometheusClient()
  const interval = timeRange === '1h' ? '5m' : timeRange === '24h' ? '1h' : '6h'

  const stages = [
    'upload_initiated',
    'file_validated',
    'job_queued',
    'processing_started',
    'processing_completed',
    'download_initiated',
    'download_completed'
  ]

  const results = await Promise.all(
    stages.map(async stage => {
      const value = await client.getRate(
        'pdflab_conversion_funnel_stage_total',
        interval,
        { stage }
      )
      return { stage, value: value || 0 }
    })
  )

  return results
}

/**
 * Get error rate by endpoint
 */
export async function getErrorRateByEndpoint(timeRange: string = '1h') {
  const client = new PrometheusClient()

  return client.getGroupedMetric(
    'pdflab_http_errors_total',
    'route'
  )
}

/**
 * Get queue depth
 */
export async function getQueueDepth() {
  const client = new PrometheusClient()

  const [waiting, active, delayed, failed] = await Promise.all([
    client.getCurrentValue('pdflab_queue_depth', { queue_name: 'conversion', state: 'waiting' }),
    client.getCurrentValue('pdflab_queue_depth', { queue_name: 'conversion', state: 'active' }),
    client.getCurrentValue('pdflab_queue_depth', { queue_name: 'conversion', state: 'delayed' }),
    client.getCurrentValue('pdflab_queue_depth', { queue_name: 'conversion', state: 'failed' })
  ])

  return {
    waiting: waiting || 0,
    active: active || 0,
    delayed: delayed || 0,
    failed: failed || 0,
    total: (waiting || 0) + (active || 0) + (delayed || 0)
  }
}

/**
 * Get SLO compliance
 */
export async function getSLOCompliance(timeWindow: '24h' | '7d' | '30d' = '30d') {
  const client = new PrometheusClient()

  const sloTypes = ['uptime', 'response_time', 'error_rate', 'conversion_time', 'api_availability']

  const results = await Promise.all(
    sloTypes.map(async sloType => {
      const value = await client.getCurrentValue(
        'pdflab_slo_compliance_percentage',
        { slo_type: sloType, time_window: timeWindow }
      )
      return { sloType, compliance: value || 0 }
    })
  )

  return results
}

/**
 * Get response time percentiles
 */
export async function getResponseTimePercentiles(route?: string) {
  const client = new PrometheusClient()

  const percentiles = ['p50', 'p75', 'p95', 'p99']

  const results = await Promise.all(
    percentiles.map(async percentile => {
      const labels: Record<string, string> = { percentile }
      if (route) {
        labels.route = route
      }
      const value = await client.getCurrentValue(
        'pdflab_response_time_percentile_ms',
        labels
      )
      return { percentile, value: value || 0 }
    })
  )

  return results
}

/**
 * Get error budget
 */
export async function getErrorBudget(sloType: string = 'uptime', timeWindow: string = '30d') {
  const client = new PrometheusClient()

  const remaining = await client.getCurrentValue(
    'pdflab_slo_error_budget_percentage',
    { slo_type: sloType, time_window: timeWindow }
  )

  const burnRate = await client.getCurrentValue(
    'pdflab_slo_error_budget_burn_rate',
    { slo_type: sloType, time_window: timeWindow }
  )

  return {
    remaining: remaining || 0,
    burnRate: burnRate || 0
  }
}
