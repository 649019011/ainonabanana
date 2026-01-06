import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Nano Banana",
  },
})

function extractFirstImageUrlFromText(text: string): string | null {
  // data URLs can be extremely long; still prefer them when present.
  const dataUrlMatch = text.match(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/)
  if (dataUrlMatch?.[0]) return dataUrlMatch[0]

  // Markdown image syntax: ![alt](https://...)
  const markdownUrlMatch = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/)
  if (markdownUrlMatch?.[1]) return markdownUrlMatch[1]

  // Plain URL. Trim common trailing punctuation.
  const urlMatch = text.match(/https?:\/\/\S+/)
  if (urlMatch?.[0]) return urlMatch[0].replace(/[)\]"'>.,]+$/, "")

  return null
}

function extractImageUrlFromMessage(message: any): string | null {
  if (!message) return null

  const buildDataUrlFromBase64 = (base64: string, mimeType?: string) => {
    const mime = mimeType && typeof mimeType === "string" ? mimeType : "image/png"
    return `data:${mime};base64,${base64}`
  }

  const looksLikeBase64 = (value: string) => {
    if (value.length < 100) return false
    return /^[A-Za-z0-9+/=\s]+$/.test(value)
  }

  const extractFromPart = (part: any): string | null => {
    if (!part) return null

    const direct =
      part.image_url?.url ??
      part.image_url ??
      part.url ??
      part.image?.url ??
      part.output?.[0]?.image_url?.url ??
      part.output?.[0]?.image_url

    if (typeof direct === "string" && direct.length > 0) return direct

    const base64 =
      part.b64_json ??
      part.image?.b64_json ??
      part.image?.data ??
      part.image_base64 ??
      part.base64

    const mimeType =
      part.mime_type ??
      part.image?.mime_type ??
      part.image?.mimeType ??
      part.content_type ??
      part.contentType

    if (typeof base64 === "string" && looksLikeBase64(base64)) {
      return buildDataUrlFromBase64(base64.replace(/\s+/g, ""), mimeType)
    }

    const partText = part.text ?? part.content
    if (typeof partText === "string") {
      const fromText = extractFirstImageUrlFromText(partText)
      if (fromText) return fromText
      if (partText.startsWith("http") || partText.startsWith("data:image")) return partText
    }

    return null
  }

  const direct =
    message.image_url?.url ??
    message.image_url ??
    message.images?.[0]?.url ??
    message.images?.[0] ??
    message.output?.[0]?.image_url?.url ??
    message.output?.[0]?.image_url

  if (typeof direct === "string" && direct.length > 0) return direct

  const content = message.content
  if (Array.isArray(content)) {
    for (const part of content) {
      const fromPart = extractFromPart(part)
      if (fromPart) return fromPart
    }
  } else if (typeof content === "string") {
    const fromText = extractFirstImageUrlFromText(content)
    if (fromText) return fromText
    if (content.startsWith("http") || content.startsWith("data:image")) return content
  } else if (content && typeof content === "object") {
    const fromObject = extractFromPart(content)
    if (fromObject) return fromObject
  }

  // Fallback: deep-scan message for a URL/data URL.
  const visited = new Set<any>()
  const walk = (value: any, depth: number): string | null => {
    if (depth > 6) return null
    if (!value) return null

    if (typeof value === "string") {
      const fromText = extractFirstImageUrlFromText(value)
      if (fromText) return fromText
      if (value.startsWith("http") || value.startsWith("data:image")) return value
      if (looksLikeBase64(value)) return buildDataUrlFromBase64(value.replace(/\s+/g, ""))
      return null
    }

    if (typeof value !== "object") return null
    if (visited.has(value)) return null
    visited.add(value)

    const fromPart = extractFromPart(value)
    if (fromPart) return fromPart

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item, depth + 1)
        if (found) return found
      }
      return null
    }

    for (const key of Object.keys(value)) {
      const found = walk((value as any)[key], depth + 1)
      if (found) return found
    }
    return null
  }

  const deepFound = walk(message, 0)
  if (deepFound) return deepFound

  return null
}

function extractTextFromMessage(message: any): string | null {
  if (!message) return null

  const content = message.content
  if (typeof content === "string" && content.trim()) return content.trim()

  if (Array.isArray(content)) {
    const texts: string[] = []
    for (const part of content) {
      const text = part?.text ?? part?.content
      if (typeof text === "string" && text.trim()) texts.push(text.trim())
    }
    if (texts.length) return texts.join("\n")
  }

  const maybeText = message.text ?? message.output_text
  if (typeof maybeText === "string" && maybeText.trim()) return maybeText.trim()

  return null
}

function safeJsonPreview(value: any, limit = 6000): string | null {
  try {
    const json = JSON.stringify(value)
    if (typeof json !== "string") return null
    return json.length > limit ? `${json.slice(0, limit)}…(truncated)` : json
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY" },
        { status: 500 }
      )
    }

    const { image, prompt } = await req.json()

    if (typeof image !== "string" || typeof prompt !== "string" || !image || !prompt.trim()) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 }
      )
    }

    if (!image.startsWith("data:image") && !image.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash-image",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${prompt.trim()}\n\n请只返回生成后的图片，不要返回解释文字。`,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
    })

    const responseContent = completion.choices?.[0]?.message
    const imageUrl = extractImageUrlFromMessage(responseContent)

    if (!imageUrl) {
      const modelText = extractTextFromMessage(responseContent)
      const isDev = process.env.NODE_ENV !== "production"
      return NextResponse.json(
        {
          error: "Model did not return an image URL",
          details: modelText
            ? `模型未返回图片，返回内容：${modelText}`
            : "Could not extract an image URL from the model response.",
          ...(isDev
            ? {
                debug: {
                  messagePreview: safeJsonPreview(responseContent),
                  messageContentType: Array.isArray(responseContent?.content)
                    ? "array"
                    : typeof responseContent?.content,
                  messageKeys: responseContent ? Object.keys(responseContent) : [],
                },
              }
            : null),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    })
  } catch (error: any) {
    console.error("Error generating image:", error?.message || error)
    const status = typeof error?.status === "number" ? error.status : 500
    const details =
      error?.error?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details,
      },
      { status }
    )
  }
}
