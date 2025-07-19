/**
 * Optimized Data Service for Raptor Esports CRM
 * Implements batching, caching, and query optimization
 */

import { supabase } from './supabase'
import { cacheManager, CacheKeys } from './cache-manager'
import type { Database } from './supabase'

type Team = Database['public']['Tables']['teams']['Row']
type User = Database['public']['Tables']['users']['Row']
type Performance = Database['public']['Tables']['performances']['Row']
type SlotExpense = Database['public']['Tables']['slot_expenses']['Row']
type Winning = Database['public']['Tables']['winnings']['Row']
type Slot = Database['public']['Tables']['slots']['Row']

interface BatchRequest {
  key: string
  resolver: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
}

class OptimizedDataService {
  private batchQueue: BatchRequest[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY = 50 // 50ms batching window

  /**
   * Teams Data Access with Optimizations
   */
  async getTeams(userRole?: string, userId?: string): Promise<Team[]> {
    const cacheKey = userId ? CacheKeys.TEAMS_BY_USER(userId) : CacheKeys.TEAMS_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        let query = supabase.from('teams').select('*')
        
        // Apply role-based filtering
        if (userRole === 'coach' || userRole === 'player') {
          if (userId) {
            // Get user's team first, then fetch that specific team
            const { data: userProfile } = await supabase
              .from('users')
              .select('team_id')
              .eq('id', userId)
              .single()
            
            if (userProfile?.team_id) {
              query = query.eq('id', userProfile.team_id)
            }
          }
        }
        
        const { data, error } = await query.order('name')
        if (error) throw error
        return data || []
      },
      'teams'
    )
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    return cacheManager.get(
      CacheKeys.TEAM_BY_ID(teamId),
      async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()
        
        if (error) throw error
        return data
      },
      'teams'
    )
  }

  /**
   * Users Data Access with Optimizations
   */
  async getUsers(filters?: { teamId?: string; role?: string }): Promise<User[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.USERS_BY_TEAM(filters.teamId)
      : filters?.role 
        ? CacheKeys.USERS_BY_ROLE(filters.role)
        : CacheKeys.USERS_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        let query = supabase
          .from('users')
          .select('*')
        
        if (filters?.teamId) {
          query = query.eq('team_id', filters.teamId)
        }
        
        if (filters?.role) {
          query = query.eq('role', filters.role)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) throw error
        return data || []
      },
      'users'
    )
  }

  async getUserProfile(userId: string): Promise<User | null> {
    return cacheManager.get(
      CacheKeys.USER_PROFILE(userId),
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) throw error
        return data
      },
      'profile'
    )
  }

  /**
   * Performance Data Access with Optimizations
   */
  async getPerformances(filters?: { 
    teamId?: string; 
    playerId?: string; 
    days?: number;
    limit?: number;
  }): Promise<Performance[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.PERFORMANCES_BY_TEAM(filters.teamId)
      : filters?.playerId 
        ? CacheKeys.PERFORMANCES_BY_PLAYER(filters.playerId)
        : filters?.days 
          ? CacheKeys.PERFORMANCES_RECENT(filters.days)
          : CacheKeys.PERFORMANCES_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        let query = supabase
          .from('performances')
          .select(`
            id, team_id, player_id, match_number, slot, map, 
            placement, kills, assists, damage, survival_time, 
            added_by, created_at
          `)
        
        if (filters?.teamId) {
          query = query.eq('team_id', filters.teamId)
        }
        
        if (filters?.playerId) {
          query = query.eq('player_id', filters.playerId)
        }
        
        if (filters?.days) {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - filters.days)
          query = query.gte('created_at', cutoffDate.toISOString())
        }
        
        query = query.order('created_at', { ascending: false })
        
        if (filters?.limit) {
          query = query.limit(filters.limit)
        }
        
        const { data, error } = await query
        if (error) throw error
        return data || []
      },
      'performances'
    )
  }

  /**
   * Financial Data Access with Optimizations
   */
  async getExpenses(filters?: { teamId?: string }): Promise<(SlotExpense & { team?: Team; slot?: Slot })[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.EXPENSES_BY_TEAM(filters.teamId)
      : CacheKeys.EXPENSES_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        let query = supabase
          .from('slot_expenses')
          .select(`
            *,
            team:team_id(id, name),
            slot:slot_id(id, organizer, time_range, date, number_of_slots, slot_rate, notes)
          `)
        
        if (filters?.teamId) {
          query = query.eq('team_id', filters.teamId)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) {
          // Fallback to simple query if joins fail
          const { data: simpleData, error: simpleError } = await supabase
            .from('slot_expenses')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (simpleError) throw simpleError
          return simpleData || []
        }
        
        return data || []
      },
      'expenses'
    )
  }

  async getWinnings(filters?: { teamId?: string }): Promise<(Winning & { team?: Team; slot?: Slot })[]> {
    const cacheKey = filters?.teamId 
      ? CacheKeys.WINNINGS_BY_TEAM(filters.teamId)
      : CacheKeys.WINNINGS_ALL
    
    return cacheManager.get(
      cacheKey,
      async () => {
        let query = supabase
          .from('winnings')
          .select(`
            *,
            team:team_id(id, name),
            slot:slot_id(id, organizer, time_range, date, number_of_slots, slot_rate, notes)
          `)
        
        if (filters?.teamId) {
          query = query.eq('team_id', filters.teamId)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) {
          // Fallback to simple query if joins fail
          const { data: simpleData, error: simpleError } = await supabase
            .from('winnings')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (simpleError) throw simpleError
          return simpleData || []
        }
        
        return data || []
      },
      'winnings'
    )
  }

  /**
   * Dashboard Data with Aggressive Caching
   */
  async getDashboardStats(userId: string, timeframe: string = '30') {
    const cacheKey = CacheKeys.DASHBOARD_STATS(userId, timeframe)
    
    return cacheManager.get(
      cacheKey,
      async () => {
        // Fetch data in parallel for better performance
        const [performances, teams, users, expenses, winnings] = await Promise.all([
          this.getPerformances({ days: parseInt(timeframe), limit: 1000 }),
          this.getTeams(),
          this.getUsers(),
          this.getExpenses(),
          this.getWinnings()
        ])

        // Calculate stats efficiently
        const stats = this.calculateDashboardStats(performances, teams, users, expenses, winnings)
        return stats
      },
      'dashboard'
    )
  }

  /**
   * Team Performance Analytics with Caching
   */
  async getTeamPerformance(teamId: string, days: number = 30) {
    const cacheKey = CacheKeys.TEAM_PERFORMANCE(teamId, days)
    
    return cacheManager.get(
      cacheKey,
      async () => {
        const performances = await this.getPerformances({ teamId, days })
        
        if (performances.length === 0) {
          return {
            totalMatches: 0,
            avgKills: 0,
            avgDamage: 0,
            avgPlacement: 0,
            kdRatio: 0,
            winRate: 0
          }
        }

        const totalMatches = performances.length
        const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
        const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
        const totalPlacements = performances.reduce((sum, p) => sum + (p.placement || 0), 0)
        const wins = performances.filter(p => (p.placement || 0) === 1).length

        return {
          totalMatches,
          avgKills: totalKills / totalMatches,
          avgDamage: totalDamage / totalMatches,
          avgPlacement: totalPlacements / totalMatches,
          kdRatio: totalKills / Math.max(totalMatches - wins, 1), // Approximate K/D
          winRate: (wins / totalMatches) * 100
        }
      },
      'teamStats'
    )
  }

  /**
   * Batch Processing for Multiple Requests
   */
  private processBatch() {
    if (this.batchQueue.length === 0) return

    const batch = [...this.batchQueue]
    this.batchQueue = []

    // Group similar requests
    const grouped = new Map<string, BatchRequest[]>()
    batch.forEach(request => {
      const baseKey = request.key.split(':')[0]
      if (!grouped.has(baseKey)) {
        grouped.set(baseKey, [])
      }
      grouped.get(baseKey)!.push(request)
    })

    // Execute batched requests
    grouped.forEach(async (requests, type) => {
      try {
        await Promise.all(
          requests.map(async request => {
            try {
              const result = await request.resolver()
              request.resolve(result)
            } catch (error) {
              request.reject(error)
            }
          })
        )
      } catch (error) {
        requests.forEach(req => req.reject(error))
      }
    })
  }

  /**
   * Helper method to calculate dashboard statistics
   */
  private calculateDashboardStats(
    performances: Performance[],
    teams: Team[],
    users: User[],
    expenses: SlotExpense[],
    winnings: Winning[]
  ) {
    const totalMatches = performances.length
    const totalKills = performances.reduce((sum, p) => sum + (p.kills || 0), 0)
    const totalDamage = performances.reduce((sum, p) => sum + (p.damage || 0), 0)
    const totalSurvival = performances.reduce((sum, p) => sum + (p.survival_time || 0), 0)
    
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.total || 0), 0)
    const totalWinnings = winnings.reduce((sum, w) => sum + (w.amount_won || 0), 0)
    
    const activeTeams = teams.filter(t => t.status === 'active').length
    const activePlayers = users.filter(u => u.role === 'player' && u.status === 'active').length

    // Calculate today's and week's matches
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const todayMatches = performances.filter(p => {
      const perfDate = new Date(p.created_at)
      return perfDate.toDateString() === today.toDateString()
    }).length

    const weekMatches = performances.filter(p => {
      const perfDate = new Date(p.created_at)
      return perfDate >= weekAgo
    }).length

    const avgPlacement = totalMatches > 0 
      ? performances.reduce((sum, p) => sum + (p.placement || 0), 0) / totalMatches 
      : 0

    return {
      totalMatches,
      totalKills,
      avgDamage: totalMatches > 0 ? totalDamage / totalMatches : 0,
      avgSurvival: totalMatches > 0 ? totalSurvival / totalMatches : 0,
      kdRatio: totalMatches > 0 ? totalKills / totalMatches : 0,
      totalExpense: totalExpenses,
      totalProfitLoss: totalWinnings - totalExpenses,
      activeTeams,
      activePlayers,
      todayMatches,
      weekMatches,
      avgPlacement
    }
  }

  /**
   * Preload essential data for faster subsequent access
   */
  async preloadEssentialData(userId: string, userRole: string) {
    console.log('🚀 Preloading essential data...')
    
    const preloadPromises = [
      this.getTeams(userRole, userId),
      this.getUserProfile(userId),
      this.getUsers({ role: 'player' }),
      this.getPerformances({ days: 7, limit: 100 })
    ]

    // Don't await, let them load in background
    Promise.allSettled(preloadPromises).then(() => {
      console.log('✅ Essential data preloaded')
    })
  }

  /**
   * Clear cache and force refresh
   */
  clearCache() {
    cacheManager.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheManager.getStats()
  }
}

// Export singleton instance
export const dataService = new OptimizedDataService()

// Query optimization helpers
export const QueryOptimizer = {
  /**
   * Select only necessary fields to reduce data transfer
   */
  getMinimalUserFields: () => 'id, name, role, team_id, avatar_url, status',
  getMinimalTeamFields: () => 'id, name, tier, status',
  getMinimalPerformanceFields: () => 'id, player_id, team_id, kills, damage, placement, created_at',
  
  /**
   * Batch multiple similar queries into one
   */
  batchQueries: async <T>(queries: (() => Promise<T>)[]): Promise<T[]> => {
    const results = await Promise.all(queries.map(query => query()))
    return results
  },
  
  /**
   * Implement pagination for large datasets
   */
  getPaginatedQuery: (page: number, limit: number = 50) => ({
    from: page * limit,
    to: (page + 1) * limit - 1
  })
}