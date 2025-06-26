"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Eye, Code } from "lucide-react"

interface MermaidDiagramProps {
  code: string
  title?: string
}

export function MermaidDiagram({ code, title }: MermaidDiagramProps) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual")
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mermaidLoaded, setMermaidLoaded] = useState(false)

  // Dynamically import mermaid to avoid SSR issues
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        const mermaid = (await import("mermaid")).default

        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "inherit",
          fontSize: 14,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
          sequence: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        })

        setMermaidLoaded(true)
      } catch (err) {
        console.error("Failed to load Mermaid:", err)
        setError("Failed to load diagram renderer")
        setIsLoading(false)
      }
    }

    loadMermaid()
  }, [])

  useEffect(() => {
    if (!mermaidLoaded || viewMode !== "visual" || !diagramRef.current) {
      return
    }

    const renderDiagram = async () => {
      try {
        setError(null)
        setIsLoading(true)

        const mermaid = (await import("mermaid")).default

        // Clear previous content
        if (diagramRef.current) {
          diagramRef.current.innerHTML = ""
        }

        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, code)

        if (diagramRef.current) {
          diagramRef.current.innerHTML = svg
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Mermaid rendering error:", err)
        setError("Failed to render diagram. Please check the syntax.")
        setIsLoading(false)
      }
    }

    renderDiagram()
  }, [mermaidLoaded, viewMode, code])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="my-6 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <Button
              variant={viewMode === "visual" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("visual")}
              className="h-8 px-3 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Visual
            </Button>
            <Button
              variant={viewMode === "code" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("code")}
              className="h-8 px-3 text-xs"
            >
              <Code className="h-3 w-3 mr-1" />
              Code
            </Button>
          </div>
          {title && <span className="text-sm font-medium text-gray-700">{title}</span>}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-8 px-3 text-xs text-gray-600 hover:text-gray-800"
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="relative">
        {viewMode === "visual" ? (
          <div className="p-6 min-h-[200px] flex items-center justify-center bg-white">
            {isLoading ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm">Rendering diagram...</span>
              </div>
            ) : error ? (
              <div className="text-center max-w-md">
                <div className="text-red-500 mb-3">
                  <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewMode("code")} className="text-xs">
                  View Source Code
                </Button>
              </div>
            ) : (
              <div
                ref={diagramRef}
                className="mermaid w-full flex justify-center"
                style={{
                  minHeight: "100px",
                  maxWidth: "100%",
                  overflow: "auto",
                }}
              />
            )}
          </div>
        ) : (
          <div className="relative">
            <pre className="p-4 bg-gray-50 text-sm overflow-auto font-mono leading-relaxed border-0">
              <code className="language-mermaid text-gray-800">{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
