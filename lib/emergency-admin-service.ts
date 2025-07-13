import { createClient } from "@supabase/supabase-js"
import type { Database } from "./supabase"

// Admin client with elevated permissions
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydjrngnnuxxswmhxwxzf.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkanJuZ25udXh4c3dtaHh3eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTcxMjgsImV4cCI6MjA2NzQ5MzEyOH0.XDsxnQRhHDttB8hRCcSADIYJ6D_-_gcoWToJbWjXn-w",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
)

export interface EmergencyAdminResult {
  success: boolean
  message?: string
  error?: string
  user_id?: string
  email?: string
  role?: string
  new_role?: string
  new_role_level?: number
}

export interface EmergencyUser {
  id: string
  email: string
  name: string
  role: string
  role_level: number
  team_id?: string
  avatar_url?: string
  created_at: string
}

export class EmergencyAdminService {
  /**
   * Create a super admin user - bypasses all RLS policies
   */
  static async createSuperAdmin(
    userId: string,
    email: string,
    name: string = 'Super Admin'
  ): Promise<EmergencyAdminResult> {
    try {
      console.log(`🚨 Creating super admin: ${email} (${userId})`)
      
      const { data, error } = await supabaseAdmin
        .rpc('emergency_create_super_admin_fixed', {
          user_id: userId,
          user_email: email,
          user_name: name
        })
      
      if (error) {
        console.error('❌ Super admin creation failed:', error)
        return {
          success: false,
          error: error.message,
          message: 'Failed to create super admin'
        }
      }
      
      console.log('✅ Super admin created successfully:', data)
      return data as EmergencyAdminResult
      
    } catch (error) {
      console.error('❌ Super admin creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create super admin'
      }
    }
  }

  /**
   * Update any user's role - bypasses RLS policies
   */
  static async updateUserRole(
    targetUserId: string,
    newRole: string,
    adminUserId?: string
  ): Promise<EmergencyAdminResult> {
    try {
      console.log(`🚨 Updating user role: ${targetUserId} -> ${newRole}`)
      
      const { data, error } = await supabaseAdmin
        .rpc('emergency_update_user_role_fixed', {
          target_user_id: targetUserId,
          new_role: newRole,
          admin_user_id: adminUserId || null
        })
      
      if (error) {
        console.error('❌ User role update failed:', error)
        return {
          success: false,
          error: error.message,
          message: 'Failed to update user role'
        }
      }
      
      console.log('✅ User role updated successfully:', data)
      return data as EmergencyAdminResult
      
    } catch (error) {
      console.error('❌ User role update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update user role'
      }
    }
  }

  /**
   * Get all users - bypasses RLS policies completely
   */
  static async getAllUsers(): Promise<EmergencyUser[]> {
    try {
      console.log('🚨 Fetching all users (bypassing RLS)')
      
      const { data, error } = await supabaseAdmin
        .rpc('emergency_get_all_users_fixed')
      
      if (error) {
        console.error('❌ Get all users failed:', error)
        return []
      }
      
      console.log(`✅ Found ${data?.length || 0} users (bypassing RLS)`)
      return data as EmergencyUser[]
      
    } catch (error) {
      console.error('❌ Get all users error:', error)
      return []
    }
  }

  /**
   * Enable safe RLS policies (replaces fixAdminPolicies)
   */
  static async enableSafeRLS(): Promise<EmergencyAdminResult> {
    try {
      console.log('🚨 Enabling safe RLS policies')
      
      const { data, error } = await supabaseAdmin
        .rpc('emergency_enable_safe_rls')
      
      if (error) {
        console.error('❌ Enable safe RLS failed:', error)
        return {
          success: false,
          error: error.message,
          message: 'Failed to enable safe RLS'
        }
      }
      
      console.log('✅ Safe RLS enabled successfully:', data)
      return data as EmergencyAdminResult
      
    } catch (error) {
      console.error('❌ Enable safe RLS error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to enable safe RLS'
      }
    }
  }

  /**
   * Cleanup emergency functions after admin access is restored
   */
  static async cleanupEmergencyFunctions(): Promise<EmergencyAdminResult> {
    try {
      console.log('🚨 Cleaning up emergency functions')
      
      const { data, error } = await supabaseAdmin
        .rpc('cleanup_emergency_functions_fixed')
      
      if (error) {
        console.error('❌ Cleanup emergency functions failed:', error)
        return {
          success: false,
          error: error.message,
          message: 'Failed to cleanup emergency functions'
        }
      }
      
      console.log('✅ Emergency functions cleaned up successfully:', data)
      return data as EmergencyAdminResult
      
    } catch (error) {
      console.error('❌ Cleanup emergency functions error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to cleanup emergency functions'
      }
    }
  }

  /**
   * Complete admin setup process
   */
  static async setupAdminAccess(
    userId: string,
    email: string,
    name: string = 'Admin User'
  ): Promise<{
    success: boolean
    steps: Array<{ step: string; success: boolean; message?: string; error?: string }>
  }> {
    const steps: Array<{ step: string; success: boolean; message?: string; error?: string }> = []
    
    try {
      // Step 1: Create super admin
      console.log('🚨 Step 1: Creating super admin')
      const createResult = await this.createSuperAdmin(userId, email, name)
      steps.push({
        step: 'Create Super Admin',
        success: createResult.success,
        message: createResult.message,
        error: createResult.error
      })
      
      // Step 2: Enable safe RLS policies
      console.log('🚨 Step 2: Enabling safe RLS policies')
      const fixResult = await this.enableSafeRLS()
      steps.push({
        step: 'Enable Safe RLS',
        success: fixResult.success,
        message: fixResult.message,
        error: fixResult.error
      })
      
      // Step 3: Verify admin access
      console.log('🚨 Step 3: Verifying admin access')
      const users = await this.getAllUsers()
      const hasAccess = users.length > 0
      steps.push({
        step: 'Verify Admin Access',
        success: hasAccess,
        message: hasAccess ? `Can access ${users.length} users` : 'No access to users',
        error: hasAccess ? undefined : 'Admin access verification failed'
      })
      
      const overallSuccess = steps.every(step => step.success)
      
      return {
        success: overallSuccess,
        steps
      }
      
    } catch (error) {
      console.error('❌ Setup admin access error:', error)
      steps.push({
        step: 'Setup Process',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        success: false,
        steps
      }
    }
  }
}