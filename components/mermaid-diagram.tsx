"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Eye, Code } from "lucide-react"

interface MermaidDiagramProps {
  code: string
  title?: string
}

export function MermaidDiagram({ code, title }: MermaidDiagramProps) {
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual")
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [diagramSvg, setDiagramSvg] = useState<string>("")

  /* ------------------------------------------------------------------ */
  /*  SANITISERS                                                        */
  /* ------------------------------------------------------------------ */

  // 1️⃣  Ensure a line-break after the diagram directive
  const directiveBreak = (src: string) =>
    src.replace(
      /^(?:\s)*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+[A-Za-z]{2}(?=[^\n])/im,
      (m) => `${m}\n`,
    )

  // 2️⃣  Fix arrow→label spacing: remove *all* whitespace that appears
  //     between an edge-operator and the opening pipe ( --> |  →  -->| )
  function normalisePipes(src: string) {
    // remove spaces **after** an arrow but **before** the first pipe
    return src.replace(
      /(-->|==>|-\.->|-\.)(\s+)\|/g, // operator + spaces + |
      (_match, operator) => `${operator}|`, // keep operator, drop spaces
    )
  }

  // 3️⃣  Convert round-corner nodes containing ,, ( or ) into square nodes
  //     e.g.  A(Some text, with comma)  ->  A["Some text, with comma"]
  const safeRoundNodes = (src: string) =>
    src.replace(/([A-Za-z0-9_]+)$$([^)]*[,()][^)]*)$$/g, (_m, id, label) => `${id}["${label.trim()}"]`)

  // Combined sanitiser
  const sanitise = (raw: string) => normalisePipes(safeRoundNodes(directiveBreak(raw.replace(/\r\n?/g, "\n"))))

  /* ------------------------------------------------------------------ */
  /*  RENDERING                                                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (viewMode !== "visual") {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const render = async () => {
      setError(null)
      setIsLoading(true)

      const prepared = sanitise(code)

      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        })

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        await mermaid.parse(prepared) // will throw if invalid
        const { svg } = await mermaid.render(id, prepared)

        if (!cancelled) {
          setDiagramSvg(svg)
          setIsLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Mermaid rendering error:", e)
          setError(
            `Failed to render diagram: ${
              e instanceof Error ? e.message : "Unknown error — please check your Mermaid syntax"
            }`,
          )
          setIsLoading(false)
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [viewMode, code])

  /* ------------------------------------------------------------------ */
  /*  UI                                                                */
  /* ------------------------------------------------------------------ */
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
      <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
        <div className="flex items-center space-x-1">
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
          {title && <span className="text-sm ml-3 font-medium text-gray-700">{title}</span>}
        </div>

        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 px-3 text-xs">
          {isCopied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" /> Copy
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      {viewMode === "visual" ? (
        <div className="p-6 min-h-[200px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
              Rendering diagram…
            </div>
          ) : error ? (
            <div className="text-center text-red-600 text-sm">{error}</div>
          ) : (
            <div className="mermaid-container w-full overflow-auto" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
          )}
        </div>
      ) : (
        <pre className="p-4 bg-gray-50 text-sm overflow-auto whitespace-pre-wrap">
          <code className="language-mermaid">{code}</code>
        </pre>
      )}
    </div>
  )
}
