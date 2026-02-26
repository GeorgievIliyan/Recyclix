import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function createUsers() {
  try {
    const { data: user1Data, error: error1 } = await supabase.auth.admin.createUser({
      email: 'user1@mail.com',
      password: 'Password1234',
      email_confirm: true,
    })
    if (error1) throw error1
    const user1Id = user1Data.user.id
    console.log('User 1 created with ID:', user1Id)

    const { data: user2Data, error: error2 } = await supabase.auth.admin.createUser({
      email: 'user2@mail.com',
      password: 'Password5678',
      email_confirm: true,
    })
    if (error2) throw error2
    const user2Id = user2Data.user.id
    console.log('User 2 created with ID:', user2Id)

    const { error: adminError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: 'ORG_ID_HERE',
        user_id: user2Id,
        role: 'admin',
      })
    if (adminError) throw adminError
    console.log('User 2 is now an organization admin.')

  } catch (err) {
    console.error('Error creating users:', err)
  }
}

createUsers()