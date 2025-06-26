"use client"

import { MermaidDiagram } from "./mermaid-diagram"

export function MermaidTest() {
  const testDiagram = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
    C --> E[End]`

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Mermaid Test</h2>
      <MermaidDiagram code={testDiagram} title="Test Diagram" />
    </div>
  )
}
