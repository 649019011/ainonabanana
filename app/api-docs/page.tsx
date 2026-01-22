import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { AuthButton } from '@/components/auth-button'

export default async function ApiDocsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const configured = isSupabaseConfigured()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2">
                <div className="text-3xl">🍌</div>
                <h1 className="text-2xl font-bold">Nano Banana</h1>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <AuthButton initialUser={user} isSupabaseConfigured={configured} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-xl text-muted-foreground">
            Learn how to integrate Nano Banana AI image editing into your applications
          </p>
        </div>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Authentication</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p>
              To use the Nano Banana API, you need to authenticate your requests. Currently, we use session-based authentication through Supabase.
            </p>
            <p>
              After logging in, your session is maintained via HTTP-only cookies, and all API requests will include your authentication automatically.
            </p>
          </div>
        </section>

        {/* Image Generation API */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Image Generation API</h2>
          <div className="bg-accent/30 border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-2">POST /api/generate</h3>
            <p className="text-muted-foreground mb-4">Generate an edited image using AI based on your input image and text prompt.</p>
          </div>

          <h3 className="text-lg font-semibold mb-3">Request Body</h3>
          <div className="bg-muted rounded-lg p-4 mb-6 overflow-x-auto">
            <pre className="text-sm"><code>{`{
  "image": "string",     // Base64 data URL or HTTP URL of the input image
  "prompt": "string"      // Text description of desired edits
}`}</code></pre>
          </div>

          <h3 className="text-lg font-semibold mb-3">Example Request</h3>
          <div className="bg-muted rounded-lg p-4 mb-6 overflow-x-auto">
            <pre className="text-sm"><code>{`const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    prompt: 'Place the subject in a snowy mountain landscape'
  })
})

const data = await response.json()
console.log(data.imageUrl) // URL of generated image`}</code></pre>
          </div>

          <h3 className="text-lg font-semibold mb-3">Response</h3>
          <div className="bg-muted rounded-lg p-4 mb-6 overflow-x-auto">
            <pre className="text-sm"><code>{`{
  "imageUrl": "string",   // URL of the generated image
  "success": true
}`}</code></pre>
          </div>

          <h3 className="text-lg font-semibold mb-3">Error Response</h3>
          <div className="bg-muted rounded-lg p-4 mb-6 overflow-x-auto">
            <pre className="text-sm"><code>{`{
  "error": "string",      // Error message
  "details": "string"     // Detailed error information
}`}</code></pre>
          </div>
        </section>

        {/* Credits System */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Credits System</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p>
              Each image generation consumes <strong>2 credits</strong>. New users receive <strong>10 free credits</strong> upon signup.
            </p>
            <p>
              Credits can be purchased through our pricing page and never expire.
            </p>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Rate Limiting</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p>
              API requests are rate limited to ensure fair usage. Limits are based on your account tier and credit balance.
            </p>
          </div>
        </section>

        {/* Support */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Support</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p>
              If you encounter any issues or have questions about the API, please contact our support team.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-accent/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍌</span>
              <span className="font-bold">Nano Banana</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Nano Banana is an independent product and is not affiliated with Google, OpenAI, or any other AI model providers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
