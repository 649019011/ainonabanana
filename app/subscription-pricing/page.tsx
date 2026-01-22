import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { isPayPalConfigured } from '@/lib/paypal/config'
import { SubscriptionPricingContent } from '@/components/subscription-pricing-content'

export default async function SubscriptionPricingPage() {
  let user = null
  let configured = isSupabaseConfigured()
  let payPalConfigured = isPayPalConfigured()

  if (configured) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      user = supabaseUser
    }
  }

  return (
    <SubscriptionPricingContent
      initialUser={user}
      isSupabaseConfigured={configured}
      isPayPalConfigured={payPalConfigured}
    />
  )
}
