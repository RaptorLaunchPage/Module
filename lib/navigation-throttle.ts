interface NavigationCall {
  path: string
  timestamp: number
  method: 'push' | 'replace'
}

class NavigationThrottle {
  private static instance: NavigationThrottle
  private navigationHistory: NavigationCall[] = []
  private readonly MAX_CALLS_PER_WINDOW = 10
  private readonly TIME_WINDOW = 10000 // 10 seconds

  static getInstance(): NavigationThrottle {
    if (!NavigationThrottle.instance) {
      NavigationThrottle.instance = new NavigationThrottle()
    }
    return NavigationThrottle.instance
  }

  private cleanupOldCalls(): void {
    const now = Date.now()
    this.navigationHistory = this.navigationHistory.filter(
      call => now - call.timestamp < this.TIME_WINDOW
    )
  }

  canNavigate(path: string, method: 'push' | 'replace' = 'push'): boolean {
    this.cleanupOldCalls()
    
    // Count recent calls
    const recentCalls = this.navigationHistory.length
    
    // Allow if under limit
    if (recentCalls < this.MAX_CALLS_PER_WINDOW) {
      this.navigationHistory.push({
        path,
        timestamp: Date.now(),
        method
      })
      return true
    }

    // Check if it's the same path (allow same-path navigation)
    const lastCall = this.navigationHistory[this.navigationHistory.length - 1]
    if (lastCall && lastCall.path === path) {
      return true
    }

    console.warn(`🚨 Navigation throttled: Too many navigation calls (${recentCalls}/${this.MAX_CALLS_PER_WINDOW}) in ${this.TIME_WINDOW}ms`)
    return false
  }

  getStats(): { recentCalls: number; maxCalls: number; timeWindow: number } {
    this.cleanupOldCalls()
    return {
      recentCalls: this.navigationHistory.length,
      maxCalls: this.MAX_CALLS_PER_WINDOW,
      timeWindow: this.TIME_WINDOW
    }
  }
}

export const navigationThrottle = NavigationThrottle.getInstance()

// Wrapper for router methods
export function throttledNavigate(
  router: any,
  path: string,
  method: 'push' | 'replace' = 'push'
): boolean {
  if (navigationThrottle.canNavigate(path, method)) {
    router[method](path)
    return true
  }
  return false
}