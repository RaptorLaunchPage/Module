/**
 * Unified Dashboard Data Access Layer
 * Handles all data fetching with consistent role-based filtering
 */

import { supabase } from './supabase'
import { DashboardPermissions, type UserRole } from './dashboard-permissions'

export interface DashboardDataOptions {
  role: UserRole
  userId: string
  teamId?: string
  timeframe?: string
  includeFinance?: boolean
  includeUsers?: boolean
  limit?: number
  offset?: number
}

export class DashboardData {
  private options: DashboardDataOptions

  constructor(options: DashboardDataOptions) {
    this.options = options
  }

  /**
   * Get comprehensive overview stats for the dashboard
   */
  async getOverviewStats() {
    const { role, userId, teamId, timeframe = '30', includeFinance = false } = this.options
    
    try {
      const timeframeDate = new Date()
      timeframeDate.setDate(timeframeDate.getDate() - parseInt(timeframe))
      
      // Base performance query with role filtering
      let performanceQuery = supabase
        .from('performances')
        .select('*')
        .gte('created_at', timeframeDate.toISOString())
      
      // Apply role-based filtering
      if (role === 'player') {
        performanceQuery = performanceQuery.eq('player_id', userId)
      } else if (role === 'coach' && teamId) {
        performanceQuery = performanceQuery.eq('team_id', teamId)
      }
      // Admin, manager, and analyst see all data
      
      const { data: performances, error: perfError } = await performanceQuery
      
      if (perfError) throw perfError
      
      // Calculate stats
      const totalMatches = performances?.length || 0
      const totalKills = performances?.reduce((sum, p) => sum + (p.kills || 0), 0) || 0
      const totalDamage = performances?.reduce((sum, p) => sum + (p.damage || 0), 0) || 0
      const totalSurvival = performances?.reduce((sum, p) => sum + (p.survival_time || 0), 0) || 0
      const totalDeaths = performances?.reduce((sum, p) => sum + (p.deaths || 0), 0) || 0
      
      const avgDamage = totalMatches > 0 ? totalDamage / totalMatches : 0
      const avgSurvival = totalMatches > 0 ? totalSurvival / totalMatches : 0
      const kdRatio = totalDeaths > 0 ? totalKills / totalDeaths : totalKills
      
      // Get today's and week's matches
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const todayMatches = performances?.filter(p => new Date(p.created_at) >= today).length || 0
      const weekMatches = performances?.filter(p => new Date(p.created_at) >= weekAgo).length || 0
      
      // Calculate average placement
      const placements = performances?.map(p => p.placement).filter(p => p > 0) || []
      const avgPlacement = placements.length > 0 ? Math.round(placements.reduce((sum, p) => sum + p, 0) / placements.length) : 0
      
      // Get financial data if allowed
      let totalExpense = 0
      let totalProfitLoss = 0
      
      if (includeFinance) {
        try {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .gte('created_at', timeframeDate.toISOString())
          
          const { data: winnings } = await supabase
            .from('winnings')
            .select('amount_won')
            .gte('created_at', timeframeDate.toISOString())
          
          totalExpense = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
          const totalWinnings = winnings?.reduce((sum, w) => sum + (w.amount_won || 0), 0) || 0
          totalProfitLoss = totalWinnings - totalExpense
        } catch (error) {
          console.warn('Error fetching financial data:', error)
        }
      }
      
      // Get active teams and players count
      let activeTeams = 0
      let activePlayers = 0
      
      if (DashboardPermissions.shouldSeeAllData(role)) {
        try {
          const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .eq('status', 'active')
          
          const { data: users } = await supabase
            .from('users')
            .select('id')
            .neq('role', 'pending')
            .neq('role', 'awaiting')
          
          activeTeams = teams?.length || 0
          activePlayers = users?.length || 0
        } catch (error) {
          console.warn('Error fetching team/user counts:', error)
        }
      }
      
      return {
        totalMatches,
        totalKills,
        avgDamage,
        avgSurvival,
        kdRatio,
        totalExpense,
        totalProfitLoss,
        activeTeams,
        activePlayers,
        todayMatches,
        weekMatches,
        avgPlacement
      }
    } catch (error: any) {
      console.error('Error getting overview stats:', error)
      return {
        totalMatches: 0,
        totalKills: 0,
        avgDamage: 0,
        avgSurvival: 0,
        kdRatio: 0,
        totalExpense: 0,
        totalProfitLoss: 0,
        activeTeams: 0,
        activePlayers: 0,
        todayMatches: 0,
        weekMatches: 0,
        avgPlacement: 0
      }
    }
  }

  /**
   * Get top performers data
   */
  async getTopPerformers() {
    const { role, userId, teamId, timeframe = '30' } = this.options
    
    try {
      const timeframeDate = new Date()
      timeframeDate.setDate(timeframeDate.getDate() - parseInt(timeframe))
      
      // Get performances with user and team data
      let performanceQuery = supabase
        .from('performances')
        .select(`
          *,
          users!inner(id, name, email, team_id),
          teams!inner(id, name)
        `)
        .gte('created_at', timeframeDate.toISOString())
      
      // Apply role-based filtering
      if (role === 'player') {
        performanceQuery = performanceQuery.eq('player_id', userId)
      } else if (role === 'coach' && teamId) {
        performanceQuery = performanceQuery.eq('team_id', teamId)
      }
      
      const { data: performances, error } = await performanceQuery
      
      if (error) throw error
      
      // Calculate top performing team
      const teamStats = new Map()
      
      performances?.forEach(perf => {
        const teamId = perf.teams?.id
        const teamName = perf.teams?.name
        
        if (!teamId || !teamName) return
        
        if (!teamStats.has(teamId)) {
          teamStats.set(teamId, {
            id: teamId,
            name: teamName,
            matches: 0,
            kills: 0,
            damage: 0,
            wins: 0,
            totalPlacement: 0
          })
        }
        
        const stats = teamStats.get(teamId)
        stats.matches += 1
        stats.kills += perf.kills || 0
        stats.damage += perf.damage || 0
        stats.totalPlacement += perf.placement || 0
        if (perf.placement === 1) stats.wins += 1
      })
      
      // Find top team
      let topTeam = null
      let bestScore = 0
      
      for (const [teamId, stats] of teamStats) {
        if (stats.matches === 0) continue
        
        const avgDamage = stats.damage / stats.matches
        const kdRatio = stats.kills / Math.max(stats.matches, 1)
        const winRate = (stats.wins / stats.matches) * 100
        
        // Performance score calculation
        const score = (avgDamage * 0.3) + (kdRatio * 20) + (winRate * 2)
        
        if (score > bestScore) {
          bestScore = score
          topTeam = {
            id: teamId,
            name: stats.name,
            matches: stats.matches,
            kills: stats.kills,
            avgDamage,
            kdRatio,
            winRate
          }
        }
      }
      
      // Calculate top performing player
      const playerStats = new Map()
      
      performances?.forEach(perf => {
        const playerId = perf.users?.id
        const playerName = perf.users?.name || perf.users?.email
        const teamName = perf.teams?.name
        
        if (!playerId || !playerName) return
        
        if (!playerStats.has(playerId)) {
          playerStats.set(playerId, {
            id: playerId,
            name: playerName,
            team: teamName,
            matches: 0,
            kills: 0,
            damage: 0,
            wins: 0
          })
        }
        
        const stats = playerStats.get(playerId)
        stats.matches += 1
        stats.kills += perf.kills || 0
        stats.damage += perf.damage || 0
        if (perf.placement === 1) stats.wins += 1
      })
      
      // Find top player
      let topPlayer = null
      let bestPlayerScore = 0
      
      for (const [playerId, stats] of playerStats) {
        if (stats.matches === 0) continue
        
        const avgDamage = stats.damage / stats.matches
        const kdRatio = stats.kills / Math.max(stats.matches, 1)
        const winRate = (stats.wins / stats.matches) * 100
        
        const score = (avgDamage * 0.3) + (kdRatio * 20) + (winRate * 2)
        
        if (score > bestPlayerScore) {
          bestPlayerScore = score
          topPlayer = {
            id: playerId,
            name: stats.name,
            team: stats.team,
            value: Math.round(score),
            metric: 'Score'
          }
        }
      }
      
      // Find highest kills and damage
      let highestKills = null
      let highestDamage = null
      
      performances?.forEach(perf => {
        const playerName = perf.users?.name || perf.users?.email
        const teamName = perf.teams?.name
        
        if (!playerName) return
        
        if (!highestKills || (perf.kills || 0) > highestKills.value) {
          highestKills = {
            id: perf.users?.id || '',
            name: playerName,
            team: teamName,
            value: perf.kills || 0,
            metric: 'Kills'
          }
        }
        
        if (!highestDamage || (perf.damage || 0) > highestDamage.value) {
          highestDamage = {
            id: perf.users?.id || '',
            name: playerName,
            team: teamName,
            value: perf.damage || 0,
            metric: 'Damage'
          }
        }
      })
      
      return {
        topTeam,
        topPlayer,
        highestKills,
        highestDamage
      }
    } catch (error: any) {
      console.error('Error getting top performers:', error)
      return {
        topTeam: null,
        topPlayer: null,
        highestKills: null,
        highestDamage: null
      }
    }
  }

  /**
   * Get recent performances
   */
  async getRecentPerformances(limit = 10) {
    const { role, userId, teamId } = this.options
    
    try {
      let query = supabase
        .from('performances')
        .select(`
          *,
          users!inner(id, name, email),
          teams!inner(id, name),
          slots(id, time_range, date)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      // Apply role-based filtering
      if (role === 'player') {
        query = query.eq('player_id', userId)
      } else if (role === 'coach' && teamId) {
        query = query.eq('team_id', teamId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error getting recent performances:', error)
      return []
    }
  }

  /**
   * Fetch users with proper role-based filtering
   */
  static async getUsers(options: DashboardDataOptions) {
    const { role, userId, limit } = options
    
    try {
      let query = supabase.from('users').select('*')
      
      // Apply role-based filtering
      if (role === 'admin') {
        // Admin sees all users
      } else if (role === 'manager') {
        // Manager sees all users except sensitive admin data
        query = query.neq('role', 'admin')
      } else if (role === 'coach' && options.teamId) {
        // Coach sees only team members
        query = query.eq('team_id', options.teamId)
      } else if (role === 'player') {
        // Player sees only themselves and team members
        query = query.or(`id.eq.${userId},team_id.eq.${options.teamId}`)
      } else {
        // Default: see only self
        query = query.eq('id', userId)
      }
      
      if (limit) query = query.limit(limit)
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: [], error: error.message }
    }
  }

  /**
   * Fetch teams with proper role-based filtering
   */
  static async getTeams(options: DashboardDataOptions) {
    const { role, userId, teamId, limit } = options
    
    try {
      let query = supabase.from('teams').select('*')
      
      // Apply role-based filtering
      if (role === 'admin' || role === 'manager') {
        // Admin/Manager sees all teams
      } else if (role === 'coach' && teamId) {
        // Coach sees only their team
        query = query.eq('id', teamId)
      } else if (role === 'player' && teamId) {
        // Player sees only their team
        query = query.eq('id', teamId)
      } else {
        // Default: no teams
        query = query.eq('id', 'none')
      }
      
      if (limit) query = query.limit(limit)
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: [], error: error.message }
    }
  }

  /**
   * Fetch performances with proper role-based filtering
   */
  static async getPerformances(options: DashboardDataOptions) {
    const { role, userId, teamId, limit } = options
    
    try {
      let query = supabase
        .from('performances')
        .select(`
          *,
          users!inner(id, name, email),
          teams!inner(id, name),
          slots(id, time_range, date)
        `)
      
      // Apply role-based filtering
      if (role === 'player') {
        query = query.eq('player_id', userId)
      } else if (role === 'coach' && teamId) {
        query = query.eq('team_id', teamId)
      }
      // Admin, manager, and analyst see all performances
      
      if (limit) query = query.limit(limit)
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: [], error: error.message }
    }
  }

  /**
   * Get overview statistics
   */
  static async getOverviewStats(options: DashboardDataOptions) {
    const { role, userId, teamId } = options
    
    try {
      // Get counts based on role permissions
      let totalUsers = 0
      let totalTeams = 0
      let totalPerformances = 0
      let totalMatches = 0
      let personalPerformances = 0
      
      // Users count
      if (DashboardPermissions.getDataPermissions(role, 'users').canView) {
        const usersResult = await this.getUsers(options)
        totalUsers = usersResult.data.length
      }
      
      // Teams count
      if (DashboardPermissions.getDataPermissions(role, 'teams').canView) {
        const teamsResult = await this.getTeams(options)
        totalTeams = teamsResult.data.length
      }
      
      // Performances count
      if (DashboardPermissions.getDataPermissions(role, 'performance').canView) {
        const performancesResult = await this.getPerformances(options)
        totalPerformances = performancesResult.data.length
        totalMatches = totalPerformances // For now, assuming 1 performance = 1 match
        
        // Personal performances for players
        if (role === 'player') {
          personalPerformances = totalPerformances
        }
      }
      
      return {
        data: {
          totalUsers,
          totalTeams,
          totalPerformances,
          totalMatches,
          personalPerformances: role === 'player' ? personalPerformances : undefined,
          recentActivity: []
        },
        error: null
      }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  /**
   * Export data to CSV format
   */
  static async exportData(dataType: 'performance' | 'teams' | 'users', options: DashboardDataOptions, format: 'csv' | 'json' = 'csv') {
    try {
      let data: any[] = []
      
      switch (dataType) {
        case 'performance':
          const performancesResult = await this.getPerformances(options)
          data = performancesResult.data
          break
        case 'teams':
          const teamsResult = await this.getTeams(options)
          data = teamsResult.data
          break
        case 'users':
          const usersResult = await this.getUsers(options)
          data = usersResult.data
          break
      }
      
      if (format === 'csv') {
        return this.convertToCSV(data)
      } else {
        return JSON.stringify(data, null, 2)
      }
    } catch (error: any) {
      throw new Error(`Export failed: ${error.message}`)
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header]
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/"/g, '""')
        }
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })
    
    return [csvHeaders, ...csvRows].join('\n')
  }
}