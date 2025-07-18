/**
 * Unified Dashboard Data Access Layer
 * Handles all data fetching with consistent role-based filtering
 */

import { supabase } from './supabase'
import { DashboardPermissions, type UserRole } from './dashboard-permissions'

export interface DashboardDataOptions {
  userRole: UserRole
  userId: string
  teamId?: string
  limit?: number
  offset?: number
}

export class DashboardData {
  /**
   * Fetch users with proper role-based filtering
   */
  static async getUsers(options: DashboardDataOptions) {
    const { userRole, userId, limit } = options
    
    try {
      let query = supabase.from('users').select('*')
      
      // Apply role-based filtering
      if (userRole === 'admin') {
        // Admin sees all users
      } else if (userRole === 'manager') {
        // Manager sees all users except sensitive admin data
        query = query.neq('role', 'admin')
      } else if (userRole === 'coach' && options.teamId) {
        // Coach sees only team members
        query = query.eq('team_id', options.teamId)
      } else if (userRole === 'player') {
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
      console.error('Error fetching users:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Fetch teams with proper role-based filtering
   */
  static async getTeams(options: DashboardDataOptions) {
    const { userRole, userId, teamId, limit } = options
    
    try {
      let query = supabase.from('teams').select('*')
      
      // Apply role-based filtering
      if (DashboardPermissions.shouldSeeAllData(userRole)) {
        // Admin and Manager see all teams
      } else if (userRole === 'coach') {
        // Coach sees only teams they coach
        query = query.eq('coach_id', userId)
      } else if (userRole === 'player' && teamId) {
        // Player sees only their team
        query = query.eq('id', teamId)
      } else {
        // Default: no teams
        return { data: [], error: null }
      }
      
      if (limit) query = query.limit(limit)
      
      const { data, error } = await query.order('name')
      
      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Fetch performances with proper role-based filtering
   */
  static async getPerformances(options: DashboardDataOptions) {
    const { userRole, userId, teamId, limit } = options
    
    try {
      let query = supabase
        .from('performances')
        .select(`
          *,
          users!performances_player_id_fkey(name, email),
          teams!performances_team_id_fkey(name),
          slots!performances_slot_fkey(organizer, date, time_range)
        `)
      
      // Apply role-based filtering - THIS IS THE KEY FIX
      if (DashboardPermissions.shouldSeeAllData(userRole)) {
        // Admin and Manager see ALL performances - no filtering
        console.log(`🔍 Dashboard Data - ${userRole} accessing ALL performance data`)
      } else if (userRole === 'coach' && teamId) {
        // Coach sees only their team's performances
        query = query.eq('team_id', teamId)
        console.log(`🔍 Dashboard Data - Coach accessing team ${teamId} performance data`)
      } else if (userRole === 'player') {
        // Player sees only their own performances
        query = query.eq('player_id', userId)
        console.log(`🔍 Dashboard Data - Player accessing own performance data`)
      } else if (userRole === 'analyst' && teamId) {
        // Analyst sees team performances
        query = query.eq('team_id', teamId)
        console.log(`🔍 Dashboard Data - Analyst accessing team ${teamId} performance data`)
      } else {
        // Default: no data
        console.log(`🔍 Dashboard Data - Role ${userRole} has no performance access`)
        return { data: [], error: null }
      }
      
      if (limit) query = query.limit(limit)
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      
      console.log(`📊 Dashboard Data - Fetched ${data?.length || 0} performance records for ${userRole}`)
      return { data: data || [], error: null }
    } catch (error: any) {
      console.error('Error fetching performances:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Fetch financial data (expenses, winnings, slots)
   */
  static async getFinancialData(options: DashboardDataOptions) {
    const { userRole, limit } = options
    
    // Only admin and manager can access financial data
    if (!['admin', 'manager'].includes(userRole)) {
      return { 
        slots: [], 
        expenses: [], 
        winnings: [], 
        error: 'Access denied' 
      }
    }
    
    try {
      const [slotsResult, expensesResult, winningsResult] = await Promise.allSettled([
        supabase.from('slots').select('*').limit(limit || 100),
        supabase.from('slot_expenses').select('*').limit(limit || 100),
        supabase.from('winnings').select('*').limit(limit || 100)
      ])
      
      return {
        slots: slotsResult.status === 'fulfilled' ? slotsResult.value.data || [] : [],
        expenses: expensesResult.status === 'fulfilled' ? expensesResult.value.data || [] : [],
        winnings: winningsResult.status === 'fulfilled' ? winningsResult.value.data || [] : [],
        error: null
      }
    } catch (error: any) {
      console.error('Error fetching financial data:', error)
      return { slots: [], expenses: [], winnings: [], error: error.message }
    }
  }

  /**
   * Get dashboard overview statistics
   */
  static async getOverviewStats(options: DashboardDataOptions) {
    const { userRole, userId, teamId } = options
    
    try {
      // Get basic counts based on role
      const stats: any = {
        totalUsers: 0,
        totalTeams: 0,
        totalPerformances: 0,
        totalMatches: 0,
        recentActivity: []
      }
      
      // Fetch data based on role permissions
      if (DashboardPermissions.shouldSeeAllData(userRole)) {
        // Admin/Manager get full statistics
        const [usersCount, teamsCount, performancesCount] = await Promise.allSettled([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('performances').select('*', { count: 'exact', head: true })
        ])
        
        stats.totalUsers = usersCount.status === 'fulfilled' ? usersCount.value.count || 0 : 0
        stats.totalTeams = teamsCount.status === 'fulfilled' ? teamsCount.value.count || 0 : 0
        stats.totalPerformances = performancesCount.status === 'fulfilled' ? performancesCount.value.count || 0 : 0
      } else {
        // Limited statistics for other roles
        if (teamId) {
          const teamPerformances = await supabase
            .from('performances')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId)
          
          stats.totalPerformances = teamPerformances.count || 0
        }
        
        if (userRole === 'player') {
          const playerPerformances = await supabase
            .from('performances')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', userId)
          
          stats.personalPerformances = playerPerformances.count || 0
        }
      }
      
      return { data: stats, error: null }
    } catch (error: any) {
      console.error('Error fetching overview stats:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Export data to CSV/Excel format
   */
  static async exportData(
    dataType: 'users' | 'teams' | 'performances' | 'finance',
    options: DashboardDataOptions,
    format: 'csv' | 'json' = 'csv'
  ) {
    const permissions = DashboardPermissions.getDataPermissions(options.userRole, dataType)
    
    if (!permissions.canExport) {
      throw new Error('Export permission denied')
    }
    
    let data: any[] = []
    
    switch (dataType) {
      case 'users':
        const usersResult = await this.getUsers(options)
        data = usersResult.data
        break
      case 'teams':
        const teamsResult = await this.getTeams(options)
        data = teamsResult.data
        break
      case 'performances':
        const performancesResult = await this.getPerformances(options)
        data = performancesResult.data
        break
      case 'finance':
        const financeResult = await this.getFinancialData(options)
        data = [...financeResult.slots, ...financeResult.expenses, ...financeResult.winnings]
        break
    }
    
    if (format === 'csv') {
      return this.convertToCSV(data)
    }
    
    return JSON.stringify(data, null, 2)
  }
  
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        }).join(',')
      )
    ].join('\n')
    
    return csvContent
  }
}