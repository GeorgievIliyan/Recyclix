import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-browser"

export async function GET() {
    const {data, error} = await supabase.auth.admin.listUsers()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({users: data.users})
}

export default GET