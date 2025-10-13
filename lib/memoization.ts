/**
 * Memoization Utilities
 *
 * Provides efficient caching and memoization for expensive operations
 */

export interface CacheOptions {
  maxSize?: number
  ttl?: number // Time to live in milliseconds
}

/**
 * Simple LRU cache implementation
 */
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>()
  private maxSize: number
  private ttl: number | null

  constructor(maxSize = 100, ttl: number | null = null) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * Memoize a function with LRU cache
 */
export function memoize<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  options: CacheOptions = {},
): (...args: Args) => Return {
  const cache = new LRUCache<string, Return>(options.maxSize, options.ttl || null)

  return (...args: Args): Return => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * Memoize an async function with LRU cache
 */
export function memoizeAsync<Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  options: CacheOptions = {},
): (...args: Args) => Promise<Return> {
  const cache = new LRUCache<string, Return>(options.maxSize, options.ttl || null)
  const pending = new Map<string, Promise<Return>>()

  return async (...args: Args): Promise<Return> => {
    const key = JSON.stringify(args)

    // Return cached result
    if (cache.has(key)) {
      return cache.get(key)!
    }

    // Return pending promise if already in flight
    if (pending.has(key)) {
      return pending.get(key)!
    }

    // Execute and cache
    const promise = fn(...args)
    pending.set(key, promise)

    try {
      const result = await promise
      cache.set(key, result)
      pending.delete(key)
      return result
    } catch (error) {
      pending.delete(key)
      throw error
    }
  }
}

/**
 * Debounce a function
 */
export function debounce<Args extends any[]>(fn: (...args: Args) => void, delay: number): (...args: Args) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Args) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttle a function
 */
export function throttle<Args extends any[]>(fn: (...args: Args) => void, limit: number): (...args: Args) => void {
  let inThrottle = false

  return (...args: Args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Batch multiple calls into a single execution
 */
export function batch<T>(fn: (items: T[]) => void, delay: number): (item: T) => void {
  let items: T[] = []
  let timeoutId: NodeJS.Timeout | null = null

  return (item: T) => {
    items.push(item)

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(items)
      items = []
      timeoutId = null
    }, delay)
  }
}
