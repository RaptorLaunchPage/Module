import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { guild_id } = await request.json()

    if (!guild_id) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 })
    }

    // Update the last_sync timestamp for the guild
    const { error } = await supabase
      .from('discord_servers')
      .update({
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('guild_id', guild_id)

    if (error) {
      console.error('Error syncing bot:', error)
      return NextResponse.json({ error: 'Failed to sync bot' }, { status: 500 })
    }

    // In a real implementation, this would trigger actual bot synchronization
    // For now, we just update the timestamp
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bot sync initiated successfully',
      synced_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Bot sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}