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

    console.log('API Called with userId:', userId || 'NO USER ID')

    let query = supabase.from('badges').select('*')
    if (onlyActive) query = query.eq('is_active', true)

    const { data: badges, error: badgesError } = await query
    if (badgesError) throw badgesError

    if (!userId) {
      console.log('No userId - returning all badges as LOCKED')
      const result = badges.map(badge => ({
        ...badge,
        id: Number(badge.id),
        locked: true
      }))
      return NextResponse.json(result)
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('badges')
      .eq('id', userId)
      .maybeSingle()

    let earnedIds: number[] = []
    
    if (profile?.badges) {
      const badgesArray = typeof profile.badges === 'string' 
        ? JSON.parse(profile.badges) 
        : profile.badges
        
      if (Array.isArray(badgesArray)) {
        earnedIds = badgesArray
          .map(id => {
            const num = Number(id)
            return isNaN(num) ? null : num
          })
          .filter((id): id is number => id !== null && id > 0)
      }
      console.log('User earned badge IDs:', earnedIds)
    }

    const result = badges.map(badge => {
      const badgeId = Number(badge.id)
      const isEarned = earnedIds.includes(badgeId)
      
      return {
        ...badge,
        id: badgeId,
        locked: !isEarned
      }
    })

    console.log(`Result: ${result.filter(b => !b.locked).length} unlocked, ${result.filter(b => b.locked).length} locked`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 })
  }
}