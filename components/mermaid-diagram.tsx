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
  const [diagramSvg, setDiagramSvg] = useState<string>("")

  // Preprocess function to clean up malformed Mermaid syntax
  const preprocessMermaidCode = (code: string): string => {
    let cleaned = code

    // Remove all table separator lines like | --- | --- | --- |
    cleaned = cleaned.replace(/^\s*\|\s*---+\s*(\|\s*---+\s*)*\|?\s*$/gm, "")

    // Fix malformed flow syntax: remove leading | from flow lines
    // Pattern: | NodeA --> | label | NodeB |
    cleaned = cleaned.replace(
      /^\s*\|\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})*)\s*(-->|==>|-\.->|---)\s*\|\s*([^|]+)\s*\|\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})*)\s*\|?\s*$/gm,
      (match, sourceNode, arrow, label, targetNode) => {
        // Clean up the label and target
        const cleanLabel = label.trim()
        const cleanTarget = targetNode.trim()

        // Return proper Mermaid syntax
        return `    ${sourceNode} ${arrow} |${cleanLabel}| ${cleanTarget}`
      },
    )

    // Fix simpler malformed lines: | NodeA --> NodeB |
    cleaned = cleaned.replace(
      /^\s*\|\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})*)\s*(-->|==>|-\.->|---)\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})*)\s*\|?\s*$/gm,
      (match, sourceNode, arrow, targetNode) => {
        return `    ${sourceNode} ${arrow} ${targetNode}`
      },
    )

    // Remove any remaining standalone pipes at the beginning or end of lines
    cleaned = cleaned.replace(/^\s*\|\s*/gm, "    ")
    cleaned = cleaned.replace(/\s*\|\s*$/gm, "")

    // Clean up extra whitespace and empty lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n")
    cleaned = cleaned.trim()

    return cleaned
  }

  useEffect(() => {
    if (viewMode !== "visual") {
      setIsLoading(false)
      return
    }

    const renderDiagram = async () => {
      try {
        setError(null)
        setIsLoading(true)

        // Preprocess the code to clean up malformed syntax
        const cleanedCode = preprocessMermaidCode(code)
        console.log("Original code:", code)
        console.log("Cleaned code:", cleanedCode)

        // Dynamic import with better error handling
        const mermaidModule = await import("mermaid")
        const mermaid = mermaidModule.default

        // Initialize mermaid with safe configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: 16,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
          sequence: {
            useMaxWidth: true,
            wrap: true,
          },
          gantt: {
            useMaxWidth: true,
          },
          pie: {
            useMaxWidth: true,
          },
          journey: {
            useMaxWidth: true,
          },
        })

        // Generate unique ID for this diagram
        const diagramId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Validate the code first
        const isValid = await mermaid.parse(cleanedCode)
        if (!isValid) {
          throw new Error("Invalid Mermaid syntax")
        }

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, cleanedCode)

        setDiagramSvg(svg)
        setIsLoading(false)
      } catch (err) {
        console.error("Mermaid rendering error:", err)
        setError(`Failed to render diagram: ${err instanceof Error ? err.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }

    // Add a small delay to ensure the component is mounted
    const timeoutId = setTimeout(renderDiagram, 100)

    return () => clearTimeout(timeoutId)
  }, [viewMode, code])

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
              <div className="flex flex-col items-center space-y-3 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-sm">Rendering diagram...</span>
                <span className="text-xs text-gray-400">This may take a moment</span>
              </div>
            ) : error ? (
              <div className="text-center max-w-md">
                <div className="text-red-500 mb-4">
                  <svg className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="font-medium text-sm mb-1">Diagram Rendering Failed</p>
                  <p className="text-xs text-gray-600 mb-3">{error}</p>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setViewMode("code")} className="text-xs">
                    View Source Code
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewMode("visual")} className="text-xs ml-2">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : diagramSvg ? (
              <div
                className="mermaid-container w-full flex justify-center"
                dangerouslySetInnerHTML={{ __html: diagramSvg }}
                style={{
                  minHeight: "100px",
                  maxWidth: "100%",
                  overflow: "auto",
                }}
              />
            ) : (
              <div className="text-gray-500 text-sm">No diagram to display</div>
            )}
          </div>
        ) : (
          <div className="relative">
            <pre className="p-4 bg-gray-50 text-sm overflow-auto font-mono leading-relaxed border-0 whitespace-pre-wrap">
              <code className="language-mermaid text-gray-800">{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
