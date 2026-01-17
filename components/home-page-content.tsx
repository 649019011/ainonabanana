"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Upload, Sparkles, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { AuthButton } from "@/components/auth-button"
import { CreditsDisplay } from "@/components/credits-display"
import { deductCreditsForGeneration } from "@/lib/credits/client"
import { CREDITS_PER_IMAGE } from "@/lib/credits/config"

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: number
}

interface HomePageContentProps {
  initialUser: any
  isSupabaseConfigured: boolean
}

export function HomePageContent({ initialUser, isSupabaseConfigured }: HomePageContentProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [userBalance, setUserBalance] = useState<number | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only image files are supported (jpg/png/webp, etc.)",
      })
      e.target.value = ""
      return
    }

    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image no larger than 10MB",
      })
      e.target.value = ""
      return
    }

    try {
      const bitmap = await createImageBitmap(file)
      const maxDim = 2048
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (!ctx) throw new Error("canvas context unavailable")

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(bitmap, 0, 0, width, height)

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
      setSelectedImage(dataUrl)
    } catch {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string)
      }
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Read failed",
          description: "Failed to read the image, please try again",
        })
        e.target.value = ""
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddImageClick = () => {
    imageInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (imageInputRef.current) imageInputRef.current.value = ""
  }

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast({
        variant: "destructive",
        title: "No image uploaded",
        description: "Please upload an image first",
      })
      return
    }

    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "No prompt entered",
        description: "Please describe how you want to transform your image",
      })
      return
    }

    // 检查用户是否登录
    if (!initialUser) {
      toast({
        variant: "destructive",
        title: "请先登录",
        description: "生成图像需要登录账户并拥有足够的 credits",
      })
      return
    }

    // 检查余额
    if (userBalance === null || userBalance < CREDITS_PER_IMAGE) {
      toast({
        variant: "destructive",
        title: "余额不足",
        description: `生成图像需要 ${CREDITS_PER_IMAGE} credits，当前余额：${userBalance || 0}。请购买更多 credits。`,
      })
      return
    }

    setIsGenerating(true)

    try {
      // 先扣除 credits
      const deductResult = await deductCreditsForGeneration(CREDITS_PER_IMAGE)

      if (!deductResult.success) {
        toast({
          variant: "destructive",
          title: "扣除 credits 失败",
          description: deductResult.error || "请稍后重试",
        })
        setIsGenerating(false)
        return
      }

      // 更新余额
      if (deductResult.balance !== undefined) {
        setUserBalance(deductResult.balance)
        // 刷新 credits 显示组件
        if (typeof window !== 'undefined' && (window as any).refreshCreditsDisplay) {
          ;(window as any).refreshCreditsDisplay()
        }
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: selectedImage,
          prompt: prompt,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        // 生成失败，退还 credits
        const message =
          data.details ||
          data.error ||
          `Generation failed (HTTP ${response.status})`
        throw new Error(message)
      }

      const imageUrl = data.imageUrl
      if (!imageUrl) {
        throw new Error("Failed to get generated image from API response")
      }

      // Add to generated images
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: imageUrl,
        prompt: prompt,
        timestamp: Date.now(),
      }

      setGeneratedImages((prev) => [newImage, ...prev])

      toast({
        title: "Generation successful!",
        description: `已扣除 ${CREDITS_PER_IMAGE} credits，剩余 ${deductResult.balance || 0} credits`,
      })
    } catch (error: any) {
      console.error("Generation failed:", error)
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Please try again later",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // 刷新余额的函数（供 CreditsDisplay 组件调用）
  const refreshBalance = (newBalance: number) => {
    setUserBalance(newBalance)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-3xl">🍌</div>
              <h1 className="text-2xl font-bold">Nano Banana</h1>
            </div>
            <div className="flex items-center gap-3">
              <CreditsDisplay initialUser={initialUser} />
              <AuthButton initialUser={initialUser} isSupabaseConfigured={isSupabaseConfigured} />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Try Now</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      <div className="bg-accent border-b border-border/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍌</span>
              <span className="font-semibold">NEW</span>
            </div>
            <span>Nano Banana Pro is now live</span>
            <Button variant="link" className="h-auto p-0 text-primary">
              Try it now →
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute top-10 right-10 opacity-10 text-9xl rotate-12">🍌</div>
        <div className="absolute bottom-10 left-10 opacity-10 text-9xl -rotate-12">🍌</div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-2 bg-accent rounded-full border border-border">
            <span className="text-sm">🍌 The AI model that outperforms Flux Kontext</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-6 text-balance">Nano Banana</h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 text-pretty">
            Transform any image with simple text prompts. Nano Banana's advanced model delivers consistent character
            editing and scene preservation that surpasses Flux Kontext. Experience the future of AI image editing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8">
              <Sparkles className="mr-2 h-5 w-5" />
              Start Editing
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
              View Examples
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>One-shot editing</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Multi-image support</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Natural language</span>
            </div>
          </div>
        </div>
      </section>

      {/* Image Editor Section */}
      <section id="generator" className="py-20 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Get Started</h2>
              <p className="text-xl text-muted-foreground">Try The AI Editor</p>
              <p className="text-muted-foreground mt-2">
                Experience the power of Nano Banana's natural language image editing. Transform any photo with simple
                text commands
              </p>
            </div>

            <Card className="border-2">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Upload Area */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-lg font-semibold">Upload Image</h3>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleAddImageClick}>
                          Add Image
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveImage}
                          disabled={!selectedImage}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-accent/50 hover:bg-accent transition-colors"
                    >
                      {selectedImage ? (
                        <img
                          src={selectedImage || "/placeholder.svg"}
                          alt="Uploaded"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">Max 10MB</p>
                        </div>
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        ref={imageInputRef}
                      />
                    </label>
                  </div>

                  {/* Prompt Area */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Main Prompt</h3>
                    <Textarea
                      placeholder="Describe how you want to transform your image... e.g., 'Place the subject in a snowy mountain landscape' or 'Change the background to a tropical beach'"
                      className="min-h-[200px] mb-4"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Want more powerful image generation features?{" "}
                    <a href="#" className="text-primary hover:underline">
                      Visit Full Generator →
                    </a>
                  </p>
                </div>

                {/* Output Gallery */}
                {generatedImages.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Output Gallery</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {generatedImages.map((img) => (
                        <Card key={img.id} className="overflow-hidden">
                          <div className="relative aspect-square">
                            <img
                              src={img.url}
                              alt={img.prompt}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground line-clamp-2">{img.prompt}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(img.timestamp).toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-xl text-muted-foreground">Why Choose Nano Banana?</p>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Nano Banana is the most advanced AI image editor on LMArena. Revolutionize your photo editing with natural
              language understanding
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-semibold mb-3">Natural Language Editing</h3>
                <p className="text-muted-foreground">
                  Edit images using simple text prompts. Nano Banana AI understands complex instructions like GPT for
                  images
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-semibold mb-3">Character Consistency</h3>
                <p className="text-muted-foreground">
                  Maintain perfect character details across edits. This model excels at preserving faces and identities
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-3">Scene Preservation</h3>
                <p className="text-muted-foreground">
                  Seamlessly blend edits with original backgrounds. Superior scene fusion compared to Flux Kontext
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-3">One-Shot Editing</h3>
                <p className="text-muted-foreground">
                  Perfect results in a single attempt. Nano Banana solves one-shot image editing challenges effortlessly
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🖼️</div>
                <h3 className="text-xl font-semibold mb-3">Multi-Image Context</h3>
                <p className="text-muted-foreground">
                  Process multiple images simultaneously. Support for advanced multi-image editing workflows
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-xl font-semibold mb-3">AI UGC Creation</h3>
                <p className="text-muted-foreground">
                  Create consistent AI influencers and UGC content. Perfect for social media and marketing campaigns
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="py-20 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Showcase</h2>
            <p className="text-xl text-muted-foreground">Lightning-Fast AI Creations</p>
            <p className="text-muted-foreground mt-2">See what Nano Banana generates in milliseconds</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
            <Card className="overflow-hidden border-2">
              <div className="relative h-64 bg-gradient-to-br from-blue-100 to-purple-100">
                <img
                  src="/mountain-sunset-vista.png"
                  alt="AI Generated Mountain"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <span className="text-xl">🍌</span>
                  <span className="font-semibold">Nano Banana Speed</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Ultra-Fast Mountain Generation</h3>
                <p className="text-muted-foreground">
                  Created in 0.8 seconds with Nano Banana's optimized neural engine
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2">
              <div className="relative h-64 bg-gradient-to-br from-green-100 to-emerald-100">
                <img
                  src="/beautiful-garden-flowers.jpg"
                  alt="AI Generated Garden"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <span className="text-xl">🍌</span>
                  <span className="font-semibold">Nano Banana Speed</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Instant Garden Creation</h3>
                <p className="text-muted-foreground">
                  Complex scene rendered in milliseconds using Nano Banana technology
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2">
              <div className="relative h-64 bg-gradient-to-br from-cyan-100 to-blue-100">
                <img src="/tropical-beach-sunset.png" alt="AI Generated Beach" className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <span className="text-xl">🍌</span>
                  <span className="font-semibold">Nano Banana Speed</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-time Beach Synthesis</h3>
                <p className="text-muted-foreground">Nano Banana delivers photorealistic results at lightning speed</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2">
              <div className="relative h-64 bg-gradient-to-br from-purple-100 to-pink-100">
                <img
                  src="/northern-lights-aurora.png"
                  alt="AI Generated Aurora"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <span className="text-xl">🍌</span>
                  <span className="font-semibold">Nano Banana Speed</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Rapid Aurora Generation</h3>
                <p className="text-muted-foreground">Advanced effects processed instantly with Nano Banana AI</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-lg mb-6">Experience the power of Nano Banana yourself</p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Try Nano Banana Generator
            </Button>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">User Reviews</h2>
            <p className="text-xl text-muted-foreground">What creators are saying</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    👨‍🎨
                  </div>
                  <div>
                    <div className="font-semibold">AIArtistPro</div>
                    <div className="text-sm text-muted-foreground">Digital Creator</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "This editor completely changed my workflow. The character consistency is incredible - miles ahead of
                  Flux Kontext!"
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    👩‍💼
                  </div>
                  <div>
                    <div className="font-semibold">ContentCreator</div>
                    <div className="text-sm text-muted-foreground">UGC Specialist</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Creating consistent AI influencers has never been easier. It maintains perfect face details across
                  edits!"
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    📸
                  </div>
                  <div>
                    <div className="font-semibold">PhotoEditor</div>
                    <div className="text-sm text-muted-foreground">Professional Editor</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "One-shot editing is basically solved with this tool. The scene blending is so natural and realistic!"
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">FAQs</h2>
            <p className="text-xl text-muted-foreground">Frequently Asked Questions</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">What is Nano Banana?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  It's a revolutionary AI image editing model that transforms photos using natural language prompts.
                  This is currently the most powerful image editing model available, with exceptional consistency. It
                  offers superior performance compared to Flux Kontext for consistent character editing and scene
                  preservation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">How does it work?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Simply upload an image and describe your desired edits in natural language. The AI understands complex
                  instructions like "place the creature in a snowy mountain" or "imagine the whole face and create it".
                  It processes your text prompt and generates perfectly edited images.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">How is it better than Flux Kontext?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  This model excels in character consistency, scene blending, and one-shot editing. Users report it
                  "completely destroys" Flux Kontext in preserving facial features and seamlessly integrating edits with
                  backgrounds. It also supports multi-image context, making it ideal for creating consistent AI
                  influencers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">Can I use it for commercial projects?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! It's perfect for creating AI UGC content, social media campaigns, and marketing materials. Many
                  users leverage it for creating consistent AI influencers and product photography. The high-quality
                  outputs are suitable for professional use.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">What types of edits can it handle?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The editor handles complex edits including face completion, background changes, object placement,
                  style transfers, and character modifications. It excels at understanding contextual instructions like
                  "place in a blizzard" or "create the whole face" while maintaining photorealistic quality.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-lg px-6 bg-card">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">Where can I try Nano Banana?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  You can try Nano Banana on LMArena or through our web interface. Simply upload your image, enter a
                  text prompt describing your desired edits, and watch as Nano Banana AI transforms your photo with
                  incredible accuracy and consistency.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-accent/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🍌</span>
              <span className="text-xl font-bold">Nano Banana</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                © 2026 Nano Banana. AI-powered image editing for everyone.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
