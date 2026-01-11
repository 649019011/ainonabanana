import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { HomePageContent } from '@/components/home-page-content'

export default async function HomePage() {
  let user = null
  let configured = isSupabaseConfigured()

  if (configured) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      user = supabaseUser
    }
  }

  return <HomePageContent initialUser={user} isSupabaseConfigured={configured} />
}
