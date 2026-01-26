// app/api/badges/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const onlyActive = searchParams.get('is_active') !== 'false'

    console.log('🔔 API Called with:', { userId: userId || 'NO USER', onlyActive })

    // Fetch badges
    let query = supabase.from('badges').select('*')
    if (onlyActive) query = query.eq('is_active', true)

    const { data: badges, error: badgesError } = await query
    if (badgesError) throw badgesError

    // If no user ID, return all as LOCKED
    if (!userId) {
      console.log('🔐 No user - returning all badges as LOCKED')
      const result = badges.map(badge => ({
        ...badge,
        id: Number(badge.id),
        locked: true
      }))
      return NextResponse.json(result)
    }

    // Fetch user's profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('badges')
      .eq('id', userId)
      .maybeSingle()

    let earnedIds: number[] = []
    
    if (profile?.badges) {
      const badgesArray = Array.isArray(profile.badges) 
        ? profile.badges 
        : JSON.parse(profile.badges || '[]')
      
      earnedIds = badgesArray
        .map((id: any) => Number(id))
        .filter((id: number) => !isNaN(id) && id > 0)
      
      console.log('🏆 User earned IDs:', earnedIds)
    }

    // Create result
    const result = badges.map(badge => {
      const badgeId = Number(badge.id)
      const isEarned = earnedIds.includes(badgeId)
      
      return {
        ...badge,
        id: badgeId,
        locked: !isEarned
      }
    })

    const unlocked = result.filter(b => !b.locked).length
    console.log(`📊 Final: ${unlocked} unlocked, ${result.length - unlocked} locked`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('💥 API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 })
  }
}