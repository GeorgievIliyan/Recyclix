import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-browser"

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-api-token')
  
  if (!token || token !== process.env.SECURE_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const { data, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ users: data.users })
}