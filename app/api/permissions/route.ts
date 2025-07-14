import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch all module permissions
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('module_permissions')
      .select('*')
    if (error) throw error
    return NextResponse.json({ success: true, permissions: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST: Update a permission (role, module, can_access)
export async function POST(req: Request) {
  try {
    const { role, module, can_access } = await req.json()
    if (!role || !module || typeof can_access !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    const { error } = await supabase
      .from('module_permissions')
      .upsert({ role, module, can_access }, { onConflict: 'role,module' })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}