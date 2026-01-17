import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { PricingPageContent } from '@/components/pricing-page-content'

export default async function PricingPage() {
  let user = null
  let configured = isSupabaseConfigured()

  if (configured) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      user = supabaseUser
    }
  }

  return <PricingPageContent initialUser={user} isSupabaseConfigured={configured} />
}
