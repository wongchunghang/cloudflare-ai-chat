"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Eye, Code, Table } from "lucide-react"

interface MermaidDiagramProps {
  code: string
  title?: string
}

export function MermaidDiagram({ code, title }: MermaidDiagramProps) {
  const [viewMode, setViewMode] = useState<"visual" | "code" | "table">("visual")
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [diagramSvg, setDiagramSvg] = useState<string>("")
  const [hasTableSyntax, setHasTableSyntax] = useState(false)
  const [extractedTables, setExtractedTables] = useState<Array<{ rows: string[][]; headers: string[] }>>([])

  /* ------------------------------------------------------------------ */
  /*  TABLE DETECTION AND EXTRACTION                                   */
  /* ------------------------------------------------------------------ */

  function detectAndExtractTables(src: string) {
    const lines = src.split("\n")
    const tables = []
    let currentTable = null
    let inTable = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Detect table separator lines like "| --- | --- | --- |"
      if (/^\|\s*---+\s*(\|\s*---+\s*)*\|?\s*$/.test(line)) {
        if (currentTable && currentTable.rows.length > 0) {
          // The previous row becomes the header
          currentTable.headers = currentTable.rows[currentTable.rows.length - 1]
          currentTable.rows.pop() // Remove header from rows
        }
        inTable = true
        continue
      }

      // Detect table-style lines like "| B --> | Yes | C[...] |"
      if (/^\|\s*.*\|.*\|.*\|?\s*$/.test(line) && !line.includes("---")) {
        const cells = line
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0)

        if (cells.length >= 2) {
          if (!currentTable) {
            currentTable = { headers: [], rows: [] }
          }
          currentTable.rows.push(cells)
          inTable = true
        }
      } else if (inTable && currentTable) {
        // End of table
        if (currentTable.rows.length > 0) {
          tables.push(currentTable)
        }
        currentTable = null
        inTable = false
      }
    }

    // Add any remaining table
    if (currentTable && currentTable.rows.length > 0) {
      tables.push(currentTable)
    }

    return tables
  }

  /* ------------------------------------------------------------------ */
  /*  SANITISERS                                                        */
  /* ------------------------------------------------------------------ */

  // 1️⃣  Ensure a line-break after the diagram directive
  const directiveBreak = (src: string) =>
    src.replace(
      /^(?:\s)*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+[A-Za-z]{2}(?=[^\n])/im,
      (m) => `${m}\n`,
    )

  // 2️⃣  Fix malformed table-like Mermaid syntax
  function fixMalformedTableSyntax(src: string) {
    const lines = src.split("\n")
    const fixedLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip empty lines
      if (!line) continue

      // Skip table separator lines like "| --- | --- | --- |"
      if (/^\|\s*---+\s*(\|\s*---+\s*)*\|?\s*$/.test(line)) {
        continue
      }

      // Fix malformed table-style lines like "| B --> | Yes | C[...] |"
      if (/^\|\s*[A-Za-z0-9_]+.*-->\s*\|.*\|.*\|?\s*$/.test(line)) {
        // Extract the parts: node, arrow, label, target
        const match = line.match(
          /^\|\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})?)\s*(-->|==>|-\.->|-\.)\s*\|\s*([^|]+)\s*\|\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})?)\s*\|?\s*$/,
        )

        if (match) {
          const [, sourceNode, arrow, label, targetNode] = match
          const cleanLabel = label.trim()
          const cleanTarget = targetNode.trim()

          // Convert to proper Mermaid syntax
          fixedLines.push(`    ${sourceNode} ${arrow} |${cleanLabel}| ${cleanTarget}`)
          continue
        }
      }

      // Fix simpler malformed lines like "| A --> | label | B |"
      if (/^\|\s*[A-Za-z0-9_]+\s*-->\s*\|.*\|.*\|?\s*$/.test(line)) {
        const match = line.match(
          /^\|\s*([A-Za-z0-9_]+)\s*(-->|==>|-\.->|-\.)\s*\|\s*([^|]+)\s*\|\s*([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\})?)\s*\|?\s*$/,
        )

        if (match) {
          const [, sourceNode, arrow, label, targetNode] = match
          const cleanLabel = label.trim()
          const cleanTarget = targetNode.trim()

          fixedLines.push(`    ${sourceNode} ${arrow} |${cleanLabel}| ${cleanTarget}`)
          continue
        }
      }

      // Keep valid Mermaid lines as-is (but clean up any stray pipes)
      let cleanLine = line

      // Remove leading/trailing pipes from otherwise valid lines
      if (line.startsWith("|") && line.endsWith("|") && !line.includes("-->")) {
        cleanLine = line.replace(/^\|\s*/, "").replace(/\s*\|$/, "")
      }

      // Only add non-empty lines
      if (cleanLine.trim()) {
        fixedLines.push(cleanLine)
      }
    }

    return fixedLines.join("\n")
  }

  // 3️⃣  Remove invalid pipes that appear directly after nodes
  function removeInvalidNodePipes(src: string) {
    return (
      src
        // Remove pipe after any node type that's not followed by an arrow
        .replace(
          /([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\}|>[^<]*<|{{[^}]*}}|\$\$\$[^)]*\$\$\$))\s*\|\s*(?!.*(?:-->|==>|-\.->|-\.))/g,
          "$1 ",
        )
        // Remove standalone pipe after node when followed by another node
        .replace(
          /([A-Za-z0-9_]+(?:\[[^\]]*\]|$$[^)]*$$|\{[^}]*\}|>[^<]*<|{{[^}]*}}|\$\$\$[^)]*\$\$\$))\s*\|\s+([A-Za-z0-9_]+)/g,
          "$1 --> $2",
        )
    )
  }

  // 4️⃣  Normalise edge-label pipes (only on actual arrows)
  function normaliseEdgePipes(src: string) {
    return (
      src
        // Fix spacing around edge labels: "A --> |label| B"
        .replace(/(-->|==>|-\.->|-\.)\s*\|\s*([^|]+?)\s*\|\s*/g, "$1 |$2| ")
        // Clean up any double spaces
        .replace(/\s+/g, " ")
    )
  }

  // 5️⃣  Convert round-corner nodes containing commas/parentheses into square nodes
  const safeRoundNodes = (src: string) =>
    src.replace(/([A-Za-z0-9_]+)$$([^)]*[,()][^)]*)$$/g, (_m, id, label) => `${id}["${label.trim()}"]`)

  // 6️⃣  Clean up extra whitespace and ensure proper indentation
  function cleanWhitespace(src: string) {
    return src
      .split("\n")
      .map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return ""

        // Add proper indentation for non-directive lines
        if (trimmed.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)/i)) {
          return trimmed
        } else {
          return `    ${trimmed}`
        }
      })
      .filter((line) => line.length > 0)
      .join("\n")
  }

  // Combined sanitiser
  const sanitise = (raw: string) => {
    let result = raw.replace(/\r\n?/g, "\n")
    result = directiveBreak(result)
    result = fixMalformedTableSyntax(result)
    result = removeInvalidNodePipes(result)
    result = normaliseEdgePipes(result)
    result = safeRoundNodes(result)
    result = cleanWhitespace(result)
    return result
  }

  /* ------------------------------------------------------------------ */
  /*  EFFECTS                                                           */
  /* ------------------------------------------------------------------ */

  // Detect tables on code change
  useEffect(() => {
    const tables = detectAndExtractTables(code)
    setExtractedTables(tables)
    setHasTableSyntax(tables.length > 0)
  }, [code])

  // Render diagram
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
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
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
              e instanceof Error ? e.message : "Unknown error — please check your Mermaid syntax"
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
          {hasTableSyntax && (
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 px-3 text-xs"
            >
              <Table className="h-3 w-3 mr-1" />
              Table
            </Button>
          )}
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
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-4">
                <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                {hasTableSyntax && (
                  <Button variant="outline" size="sm" onClick={() => setViewMode("table")} className="text-xs ml-2">
                    View as Table
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setViewMode("visual")} className="text-xs ml-2">
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="mermaid-container w-full overflow-auto" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="p-6">
          {extractedTables.length > 0 ? (
            <div className="space-y-6">
              {extractedTables.map((table, tableIndex) => (
                <div key={tableIndex} className="overflow-x-auto">
                  <table className="min-w-full border-collapse bg-white border border-gray-300 rounded-lg shadow-sm">
                    {table.headers.length > 0 && (
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          {table.headers.map((header, headerIndex) => (
                            <th
                              key={headerIndex}
                              className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody className="divide-y divide-gray-200">
                      {table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors duration-150">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="border border-gray-300 px-4 py-3 text-sm text-gray-700 leading-relaxed"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="text-xs text-gray-500 mt-4">
                <p className="mb-2">
                  <strong>Note:</strong> This table view shows the Markdown table syntax detected in the Mermaid code.
                </p>
                <p>
                  Switch to <strong>Visual</strong> to see the converted flowchart diagram, or <strong>Code</strong> to
                  see the raw syntax.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Table className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No table syntax detected in this diagram.</p>
            </div>
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
