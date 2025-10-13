/**
 * Performance Monitoring Utility
 *
 * Tracks and reports on application performance metrics including:
 * - Component render times
 * - API call durations
 * - Memory usage
 * - Bundle size impact
 */

export interface PerformanceMetric {
  id: string
  name: string
  type: "render" | "api" | "memory" | "custom"
  duration?: number
  timestamp: number
  metadata?: Record<string, any>
}

export interface PerformanceReport {
  metrics: PerformanceMetric[]
  summary: {
    avgRenderTime: number
    avgApiTime: number
    slowestRenders: PerformanceMetric[]
    slowestApiCalls: PerformanceMetric[]
    memoryUsage?: {
      current: number
      peak: number
      average: number
    }
  }
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000
  private marks = new Map<string, number>()

  /**
   * Start measuring a performance metric
   */
  start(name: string, type: PerformanceMetric["type"] = "custom", metadata?: Record<string, any>): void {
    const key = `${type}_${name}`
    this.marks.set(key, performance.now())

    if (metadata) {
      this.marks.set(`${key}_metadata`, metadata as any)
    }
  }

  /**
   * End measuring and record the metric
   */
  end(name: string, type: PerformanceMetric["type"] = "custom"): number | null {
    const key = `${type}_${name}`
    const startTime = this.marks.get(key)

    if (!startTime) {
      console.warn(`[PerformanceMonitor] No start mark found for: ${key}`)
      return null
    }

    const duration = performance.now() - startTime
    const metadata = this.marks.get(`${key}_metadata`) as Record<string, any> | undefined

    const metric: PerformanceMetric = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      duration,
      timestamp: Date.now(),
      metadata,
    }

    this.metrics.push(metric)

    // Maintain max metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }

    // Cleanup marks
    this.marks.delete(key)
    this.marks.delete(`${key}_metadata`)

    return duration
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    type: PerformanceMetric["type"] = "custom",
    metadata?: Record<string, any>,
  ): Promise<T> {
    this.start(name, type, metadata)
    try {
      const result = await fn()
      this.end(name, type)
      return result
    } catch (error) {
      this.end(name, type)
      throw error
    }
  }

  /**
   * Record a custom metric
   */
  record(metric: Omit<PerformanceMetric, "id" | "timestamp">): void {
    this.metrics.push({
      ...metric,
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    })

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(filters?: { type?: PerformanceMetric["type"]; name?: string }): PerformanceMetric[] {
    let metrics = [...this.metrics]

    if (filters) {
      if (filters.type) {
        metrics = metrics.filter((m) => m.type === filters.type)
      }
      if (filters.name) {
        metrics = metrics.filter((m) => m.name === filters.name)
      }
    }

    return metrics
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const renderMetrics = this.getMetrics({ type: "render" })
    const apiMetrics = this.getMetrics({ type: "api" })

    const avgRenderTime =
      renderMetrics.length > 0 ? renderMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / renderMetrics.length : 0

    const avgApiTime =
      apiMetrics.length > 0 ? apiMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / apiMetrics.length : 0

    const slowestRenders = [...renderMetrics].sort((a, b) => (b.duration || 0) - (a.duration || 0)).slice(0, 10)

    const slowestApiCalls = [...apiMetrics].sort((a, b) => (b.duration || 0) - (a.duration || 0)).slice(0, 10)

    return {
      metrics: this.metrics,
      summary: {
        avgRenderTime,
        avgApiTime,
        slowestRenders,
        slowestApiCalls,
        memoryUsage: this.getMemoryUsage(),
      },
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage():
    | {
        current: number
        peak: number
        average: number
      }
    | undefined {
    if ("memory" in performance) {
      const memory = (performance as any).memory
      return {
        current: memory.usedJSHeapSize,
        peak: memory.jsHeapSizeLimit,
        average: memory.totalJSHeapSize,
      }
    }
    return undefined
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
    this.marks.clear()
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        version: "1.0.0",
        exportTime: Date.now(),
        report: this.generateReport(),
      },
      null,
      2,
    )
  }
}

// Singleton instance
let globalMonitor: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor()
  }
  return globalMonitor
}

export function destroyPerformanceMonitor(): void {
  globalMonitor = null
}

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const monitor = getPerformanceMonitor()

  // Track mount time
  const mountTime = performance.now()

  // Track render
  monitor.start(componentName, "render")

  return {
    endRender: () => {
      monitor.end(componentName, "render")
    },
    trackAction: (actionName: string, fn: () => void | Promise<void>) => {
      return monitor.measure(`${componentName}.${actionName}`, fn, "custom")
    },
    getMountDuration: () => performance.now() - mountTime,
  }
}
