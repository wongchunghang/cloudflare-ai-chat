"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send, Copy, Check, Settings } from "lucide-react"
import { MarkdownMessage } from "@/components/markdown-message"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  model?: string
}

// Common Cloudflare AI models
const AVAILABLE_MODELS = [
  { id: "@cf/meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B (Current)" },
  { id: "@cf/meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
  { id: "@cf/meta/llama-3-8b-instruct", name: "Llama 3 8B" },
  { id: "@cf/mistral/mistral-7b-instruct-v0.1", name: "Mistral 7B" },
  { id: "@cf/microsoft/phi-2", name: "Microsoft Phi-2" },
  { id: "@cf/qwen/qwen1.5-14b-chat-awq", name: "Qwen 1.5 14B" },
  { id: "@cf/google/gemma-7b-it", name: "Google Gemma 7B" },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    console.log("=== FRONTEND: Sending message ===")
    console.log("User message:", userMessage)
    console.log("Selected model:", selectedModel)

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    // Create an initial empty assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString()
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
      model: selectedModel,
    }

    setMessages((prev) => [...prev, initialAssistantMessage])

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    try {
      console.log("Making streaming API call...")
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
        }),
        signal,
      })

      console.log("API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("API error response:", errorData)
        throw new Error(`HTTP ${response.status}: ${errorData}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body reader available")
      }

      console.log("Starting to read stream...")
      let accumulatedContent = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log("Stream reading complete")
          break
        }

        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages from the buffer
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || "" // Keep the last incomplete chunk in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) // Remove 'data: ' prefix
              console.log("Parsed chunk data:", data)

              if (data.type === "text-delta" && data.textDelta) {
                accumulatedContent += data.textDelta

                // Update the streaming message with accumulated content
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg)),
                )
              } else if (data.type === "finish") {
                console.log("Stream finished")
                // Mark streaming as complete
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg)),
                )
              }
            } catch (parseError) {
              console.error("Failed to parse chunk:", parseError, "Raw line:", line)
            }
          }
        }
      }

      console.log("Final accumulated content length:", accumulatedContent.length)

      // Ensure streaming is marked as complete
      setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg)))
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Request was aborted")
      } else {
        console.error("=== FRONTEND ERROR ===")
        console.error("Error:", error)
        console.error("=== END FRONTEND ERROR ===")

        // Remove the streaming message and show error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
        setError(error instanceof Error ? error.message : "An unknown error occurred")
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const getModelName = (modelId: string) => {
    return AVAILABLE_MODELS.find((m) => m.id === modelId)?.name || modelId
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-4xl h-[85vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-center">Cloudflare AI Chatbot</CardTitle>
              <p className="text-sm text-gray-500 text-center">Multi-model streaming responses with Markdown</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="p-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">AI Model:</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="mb-2">Start a conversation by sending a message</p>
                <p className="text-xs">Current model: {getModelName(selectedModel)}</p>
                <p className="text-xs mt-1">Try asking: "What is Vercel?" or "Explain React hooks"</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex items-start gap-3 max-w-[90%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar
                      className={`h-8 w-8 flex-shrink-0 ${message.role === "user" ? "bg-blue-500" : "bg-gray-300"}`}
                    >
                      <AvatarFallback className="text-xs">{message.role === "user" ? "U" : "AI"}</AvatarFallback>
                    </Avatar>
                    <div
                      className={`rounded-lg px-4 py-3 relative group ${
                        message.role === "user" ? "bg-blue-500 text-white" : "bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <div className="relative">
                          <MarkdownMessage
                            content={message.content || " "} // Ensure there's always content for the component
                            className={message.role === "assistant" ? "text-gray-800" : ""}
                          />
                          {/* Show streaming indicator */}
                          {message.isStreaming && (
                            <div className="flex items-center mt-2 text-gray-400">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              <span className="text-xs">
                                Streaming from {getModelName(message.model || selectedModel)}...
                              </span>
                            </div>
                          )}
                          {/* Show model info for completed messages */}
                          {!message.isStreaming && message.model && (
                            <div className="text-xs text-gray-400 mt-2">Generated by {getModelName(message.model)}</div>
                          )}
                        </div>
                      )}

                      {/* Copy button for AI messages */}
                      {message.role === "assistant" && !message.isStreaming && message.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => copyToClipboard(message.content, message.id)}
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {isLoading && messages.filter((m) => m.isStreaming).length === 0 && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-[90%]">
                <Avatar className="h-8 w-8 bg-gray-300">
                  <AvatarFallback className="text-xs">AI</AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-3 bg-white border border-gray-200 shadow-sm flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Connecting to {getModelName(selectedModel)}...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${getModelName(selectedModel)} anything...`}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
