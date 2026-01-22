import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { AuthButton } from '@/components/auth-button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, Upload, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function QuickStartPage() {
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
              <Link href="/" className="flex items-center gap-2">
                <div className="text-3xl">🍌</div>
                <h1 className="text-2xl font-bold">Nano Banana</h1>
              </Link>
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
          <h1 className="text-4xl font-bold mb-4">Quick Start Guide</h1>
          <p className="text-xl text-muted-foreground">
            Get started with Nano Banana AI image editing in minutes
          </p>
        </div>

        {/* Step 1 */}
        <Card className="border-2 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">Create Your Account</h2>
                <p className="text-muted-foreground mb-4">
                  Sign up for a free account to get started. You'll receive <strong>10 free credits</strong> (enough for 5 images) as a welcome bonus.
                </p>
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Free to sign up</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-semibold">10 free credits included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-semibold">No credit card required</span>
                  </div>
                </div>
                {!user && (
                  <div className="mt-4">
                    <Link href="/auth/signin">
                      <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold">
                        Sign Up Now
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="border-2 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">Upload Your Image</h2>
                <p className="text-muted-foreground mb-4">
                  Upload any photo you want to edit. Supports JPG, PNG, WebP formats up to 10MB.
                </p>
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <span>Drag & drop or click to upload</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>Images are automatically compressed for optimal performance</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="border-2 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">Describe Your Edit</h2>
                <p className="text-muted-foreground mb-4">
                  Use natural language to describe how you want to transform your image. Be specific for best results.
                </p>
                <div className="bg-accent/50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold mb-2">Example prompts:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• "Place the subject in a snowy mountain landscape"</li>
                    <li>• "Change the background to a tropical beach at sunset"</li>
                    <li>• "Add professional studio lighting"</li>
                    <li>• "Transform into a watercolor painting style"</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card className="border-2 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3">Generate & Download</h2>
                <p className="text-muted-foreground mb-4">
                  Click generate and watch the AI transform your image in seconds. Download your result instantly.
                </p>
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Generation takes ~1-3 seconds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>High-quality output ready for commercial use</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Info */}
        <Card className="border-2 mb-8 bg-primary/5">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Understanding Credits</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>• <strong>2 credits</strong> = 1 generated image</p>
              <p>• New users get <strong>10 free credits</strong> (5 images)</p>
              <p>• Purchase credit packs that never expire</p>
              <p>• Larger packs offer better value</p>
            </div>
            <div className="mt-6">
              <Link href="/pricing">
                <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold">
                  View Pricing
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Tips for Best Results</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Be Specific</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed descriptions produce better results. Include lighting, style, and composition details.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Use High-Quality Input</h3>
                <p className="text-sm text-muted-foreground">
                  Start with clear, well-lit photos for the best AI editing results.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Experiment Freely</h3>
                <p className="text-sm text-muted-foreground">
                  Try different prompts and variations. Credits are affordable and never expire.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Iterate to Perfect</h3>
                <p className="text-sm text-muted-foreground">
                  Use previous results as input for further refinements and adjustments.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-12 bg-accent/30 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Creating?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of creators using Nano Banana for AI image editing
          </p>
          <Link href="/">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg font-semibold text-lg">
              Try Now - It's Free
            </button>
          </Link>
        </div>
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
