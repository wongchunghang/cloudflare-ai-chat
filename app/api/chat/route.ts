// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// Helper function to extract AI response from various formats
function extractAIResponse(data: any, modelName?: string): string {
  console.log("Extracting response for model:", modelName)
  console.log("Data structure:", JSON.stringify(data, null, 2))

  // Handle different response formats based on model type
  if (typeof data === "string") {
    console.log("Response is plain string")
    return data
  }

  // Common Cloudflare AI response formats
  const possiblePaths = [
    // Standard Cloudflare AI format
    "result.response",
    "result",

    // Alternative formats
    "response",
    "text",
    "content",
    "answer",
    "output",
    "message",

    // OpenAI-style formats (if using compatible models)
    "choices.0.message.content",
    "choices.0.text",

    // Anthropic-style formats
    "completion",

    // Hugging Face style
    "generated_text",

    // Meta Llama specific
    "generation",
    "llama_response",

    // Mistral specific
    "mistral_response",

    // Google models
    "candidates.0.content.parts.0.text",
    "predictions.0.content",
  ]

  // Try each possible path
  for (const path of possiblePaths) {
    const value = getNestedValue(data, path)
    if (value && typeof value === "string" && value.trim().length > 0) {
      console.log(`Found response at path: ${path}`)
      return value
    }
  }

  // If no standard path works, try to find any string value in the object
  const stringValues = findStringValues(data)
  if (stringValues.length > 0) {
    // Return the longest string value (likely the main response)
    const longestString = stringValues.reduce((a, b) => (a.length > b.length ? a : b))
    console.log("Using longest string value found:", longestString.substring(0, 100) + "...")
    return longestString
  }

  // Last resort: stringify the entire object
  console.log("No suitable response found, stringifying entire object")
  return JSON.stringify(data, null, 2)
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object") {
      return current[key]
    }
    return undefined
  }, obj)
}

// Helper function to find all string values in an object
function findStringValues(obj: any, maxDepth = 3, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return []

  const strings: string[] = []

  if (typeof obj === "string" && obj.trim().length > 10) {
    strings.push(obj)
  } else if (Array.isArray(obj)) {
    obj.forEach((item) => {
      strings.push(...findStringValues(item, maxDepth, currentDepth + 1))
    })
  } else if (obj && typeof obj === "object") {
    Object.values(obj).forEach((value) => {
      strings.push(...findStringValues(value, maxDepth, currentDepth + 1))
    })
  }

  return strings
}

// Helper function to check if a line looks like a table row
function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  // Must contain at least one pipe and have content
  return trimmed.includes("|") && trimmed.length > 2
}

// Helper function to check if a line is a table separator
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim()
  // Separator contains only |, -, :, and whitespace
  const separatorPattern = /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
  return separatorPattern.test(trimmed)
}

// Helper function to normalize table structure
function normalizeTable(tableLines: string[]): string {
  console.log("[SERVER] === NORMALIZING COMPLETE TABLE ===")
  console.log(`[SERVER] Input table has ${tableLines.length} lines`)

  if (tableLines.length === 0) {
    console.log("[SERVER] Empty table, returning empty string")
    return ""
  }

  // Filter out empty lines and ensure all lines are table rows
  const validRows = tableLines.map((line) => line.trim()).filter((line) => line.length > 0 && isTableRow(line))

  console.log(`[SERVER] Valid table rows: ${validRows.length}`)

  if (validRows.length === 0) {
    console.log("[SERVER] No valid table rows found")
    return ""
  }

  // Separate data rows from separator rows
  const dataRows = []
  const separatorRows = []

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i]
    if (isTableSeparator(row)) {
      console.log(`[SERVER] Found separator at position ${i}: "${row}"`)
      separatorRows.push({ index: i, content: row })
    } else {
      console.log(`[SERVER] Found data row at position ${i}: "${row.substring(0, 50)}..."`)
      dataRows.push(row)
    }
  }

  console.log(`[SERVER] Data rows: ${dataRows.length}, Separator rows: ${separatorRows.length}`)

  if (dataRows.length === 0) {
    console.log("[SERVER] No data rows found")
    return ""
  }

  // Determine column count from the first data row (header)
  const headerRow = dataRows[0]
  const columnCount = countTableColumns(headerRow)
  console.log(`[SERVER] Header row: "${headerRow}"`)
  console.log(`[SERVER] Column count: ${columnCount}`)

  if (columnCount === 0) {
    console.log("[SERVER] Invalid column count")
    return ""
  }

  // Normalize all data rows to have consistent column count
  const normalizedRows = dataRows.map((row, index) => {
    const normalized = normalizeTableRow(row, columnCount)
    console.log(`[SERVER] Row ${index + 1}: "${row}" -> "${normalized}"`)
    return normalized
  })

  // Create the final table: header + separator + data rows
  const finalTable = []

  // Add header
  finalTable.push(normalizedRows[0])

  // Add separator after header
  const separator = createTableSeparator(columnCount)
  finalTable.push(separator)
  console.log(`[SERVER] Added separator: "${separator}"`)

  // Add remaining data rows
  for (let i = 1; i < normalizedRows.length; i++) {
    finalTable.push(normalizedRows[i])
  }

  const result = finalTable.join("\n")
  console.log("[SERVER] === FINAL NORMALIZED TABLE ===")
  console.log(result)
  console.log("[SERVER] === END NORMALIZED TABLE ===")

  return result
}

// Helper function to count columns in a table row
function countTableColumns(row: string): number {
  if (!row.includes("|")) return 0

  let cleaned = row.trim()

  // Remove leading and trailing pipes
  if (cleaned.startsWith("|")) cleaned = cleaned.substring(1)
  if (cleaned.endsWith("|")) cleaned = cleaned.substring(0, cleaned.length - 1)

  // Split by | and count non-empty cells
  const cells = cleaned
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0)

  return cells.length
}

// Helper function to normalize a single table row
function normalizeTableRow(row: string, targetColumns: number): string {
  if (!row.includes("|")) return row

  let cleaned = row.trim()

  // Remove leading/trailing pipes temporarily
  if (cleaned.startsWith("|")) cleaned = cleaned.substring(1)
  if (cleaned.endsWith("|")) cleaned = cleaned.substring(0, cleaned.length - 1)

  // Split and clean cells
  let cells = cleaned.split("|").map((cell) => cell.trim())

  // Adjust cell count
  if (cells.length > targetColumns) {
    // Merge extra cells into the last column
    const extraCells = cells.slice(targetColumns - 1)
    cells = cells.slice(0, targetColumns - 1)
    cells.push(extraCells.join(" | "))
  } else if (cells.length < targetColumns) {
    // Add empty cells
    while (cells.length < targetColumns) {
      cells.push("")
    }
  }

  // Reconstruct row
  return "| " + cells.join(" | ") + " |"
}

// Helper function to create table separator
function createTableSeparator(columns: number): string {
  const separators = Array(columns).fill("---")
  return "| " + separators.join(" | ") + " |"
}

// Helper function to clean and normalize response text
function cleanResponseText(text: string): string {
  // Handle literal escape sequences
  let cleaned = text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"')
    .replace(/^\s*["']|["']\s*$/g, "")
    .trim()

  // Fix hyphen-style bullet points
  cleaned = cleaned.replace(/([^\n])(- )/g, "$1\n\n$2")
  cleaned = cleaned.replace(/\n- /g, "\n\n- ")

  // Fix numbered lists
  cleaned = cleaned.replace(/(\d+\.\s+[^\n]+)(\d+\.\s+)/g, "$1\n\n$2")

  // Fix consecutive headers
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(\*\*)/g, "$1\n\n$2")

  return cleaned
}

// NEW: Complete table-aware content chunking
function createStreamableChunks(text: string): Array<{ type: string; content: string }> {
  console.log("[SERVER] === CREATING STREAMABLE CHUNKS (TABLE-AWARE) ===")

  const chunks = []
  const lines = text.split("\n")
  let currentTextChunk = ""
  let currentTableLines = []
  let inTable = false
  let tableCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    console.log(`[SERVER] Line ${i + 1}: "${trimmedLine.substring(0, 60)}..." (inTable: ${inTable})`)

    // Check if this line starts a table
    if (!inTable && isTableRow(trimmedLine)) {
      console.log(`[SERVER] 🔍 Potential table start detected at line ${i + 1}`)

      // Look ahead to confirm this is actually a table (not just a single line with |)
      let isActualTable = false
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim()
        if (isTableRow(nextLine)) {
          isActualTable = true
          console.log(`[SERVER] ✅ Confirmed table - found another table row at line ${j + 1}`)
          break
        } else if (nextLine.length > 0) {
          // Non-empty, non-table line found - probably not a table
          console.log(`[SERVER] ❌ Not a table - found non-table content at line ${j + 1}`)
          break
        }
      }

      if (isActualTable) {
        tableCount++
        console.log(`[SERVER] 📊 Starting table ${tableCount} collection`)

        // Flush any existing text content
        if (currentTextChunk.trim()) {
          console.log(`[SERVER] 📝 Flushing text chunk before table: "${currentTextChunk.substring(0, 50)}..."`)
          chunks.push({ type: "text", content: currentTextChunk.trim() })
          currentTextChunk = ""
        }

        inTable = true
        currentTableLines = [line]
      } else {
        // Not actually a table, treat as regular text
        console.log(`[SERVER] 📝 False alarm - treating as regular text`)
        currentTextChunk += (currentTextChunk ? "\n" : "") + line
      }
    }
    // Continue collecting table lines
    else if (inTable && isTableRow(trimmedLine)) {
      console.log(`[SERVER] 📊 Adding line to table ${tableCount}`)
      currentTableLines.push(line)
    }
    // End of table detected
    else if (inTable && !isTableRow(trimmedLine)) {
      console.log(`[SERVER] 🏁 Table ${tableCount} ended at line ${i + 1}`)
      console.log(`[SERVER] 📊 Processing complete table ${tableCount} with ${currentTableLines.length} lines`)

      // Process the complete table
      const normalizedTable = normalizeTable(currentTableLines)

      if (normalizedTable.trim()) {
        console.log(`[SERVER] ✅ Adding complete table ${tableCount} as single chunk`)
        chunks.push({ type: "table", content: normalizedTable })
      } else {
        console.log(`[SERVER] ⚠️ Table ${tableCount} normalization failed, skipping`)
      }

      // Reset table collection
      inTable = false
      currentTableLines = []

      // Start new text chunk with current line (if not empty)
      if (trimmedLine) {
        currentTextChunk = line
        console.log(`[SERVER] 📝 Starting new text chunk after table`)
      }
    }
    // Regular text line
    else if (!inTable) {
      currentTextChunk += (currentTextChunk ? "\n" : "") + line
    }
    // Skip empty lines while in table (they'll be handled by normalization)
    else {
      console.log(`[SERVER] ⏭️ Skipping empty line while in table`)
    }
  }

  // Handle any remaining table
  if (inTable && currentTableLines.length > 0) {
    console.log(`[SERVER] 🏁 Processing final table ${tableCount} with ${currentTableLines.length} lines`)
    const normalizedTable = normalizeTable(currentTableLines)

    if (normalizedTable.trim()) {
      console.log(`[SERVER] ✅ Adding final complete table as single chunk`)
      chunks.push({ type: "table", content: normalizedTable })
    }
  }

  // Handle any remaining text
  if (currentTextChunk.trim()) {
    console.log(`[SERVER] 📝 Adding final text chunk`)
    chunks.push({ type: "text", content: currentTextChunk.trim() })
  }

  console.log(`[SERVER] === CHUNKS SUMMARY ===`)
  console.log(`[SERVER] Total chunks: ${chunks.length}`)
  chunks.forEach((chunk, i) => {
    console.log(`[SERVER] Chunk ${i + 1}: ${chunk.type} (${chunk.content.length} chars)`)
  })
  console.log(`[SERVER] === END CHUNKS SUMMARY ===`)

  return chunks
}

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json()
    console.log("=== API ROUTE START ===")
    console.log("Received messages:", JSON.stringify(messages, null, 2))
    console.log("Requested model:", model)

    const workerUrl = "https://ai-binding-test.consultchwong.workers.dev" || process.env.CLOUDFLARE_WORKER_URL
    console.log("Using worker URL:", workerUrl)

    // Get the latest user message
    const lastMessage = messages[messages.length - 1]
    const userPrompt = lastMessage?.content || "Hello"
    console.log("User prompt:", userPrompt)

    console.log("Sending request to worker...")
    const requestBody = {
      prompt: userPrompt,
      ...(model && { model }),
    }

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log("Worker response status:", response.status)
    console.log("Worker response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Cloudflare Worker error: ${response.status}`)
      console.error("Error text:", errorText)
      return new Response(JSON.stringify({ error: `Worker error: ${errorText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get the complete raw response
    const responseText = await response.text()
    console.log("=== RAW WORKER RESPONSE ===")
    console.log("Response length:", responseText.length)
    console.log("First 500 chars:", responseText.substring(0, 500))
    console.log("=== END RAW RESPONSE ===")

    let aiResponse = ""

    try {
      console.log("Attempting to parse as JSON...")
      const data = JSON.parse(responseText)
      console.log("JSON parsing successful!")
      aiResponse = extractAIResponse(data, model)
    } catch (jsonError) {
      console.log("JSON parsing failed:", jsonError.message)
      console.log("Treating response as plain text")
      aiResponse = responseText
    }

    console.log("=== EXTRACTED AI RESPONSE ===")
    console.log("AI response length:", aiResponse.length)
    console.log("First 200 chars:", aiResponse.substring(0, 200))
    console.log("=== END AI RESPONSE ===")

    // Ensure we have a response
    if (!aiResponse || aiResponse.trim().length === 0) {
      aiResponse = "No response received from AI"
      console.log("Empty response, using fallback")
    }

    // Clean up the response
    const cleanedResponse = cleanResponseText(aiResponse)

    console.log("=== CLEANED RESPONSE ===")
    console.log("Cleaned response length:", cleanedResponse.length)
    console.log("First 300 chars:", cleanedResponse.substring(0, 300))
    console.log("=== END CLEANED RESPONSE ===")

    // Create streamable chunks with complete table handling
    const streamChunks = createStreamableChunks(cleanedResponse)

    // Create streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        console.log("Starting table-aware streaming...")

        let chunkIndex = 0

        const sendNextChunk = () => {
          if (chunkIndex < streamChunks.length) {
            const chunk = streamChunks[chunkIndex]
            const isLastChunk = chunkIndex === streamChunks.length - 1

            let textToSend = chunk.content

            // Add appropriate spacing after chunks
            if (!isLastChunk) {
              textToSend += "\n\n"
            }

            const sseChunk = `data: ${JSON.stringify({
              type: "text-delta",
              textDelta: textToSend,
            })}\n\n`

            console.log(
              `Sending ${chunk.type} chunk ${chunkIndex + 1}/${streamChunks.length} (${chunk.content.length} chars)`,
            )
            controller.enqueue(encoder.encode(sseChunk))

            chunkIndex++

            // Adjust timing: tables get more time to render
            const delay = chunk.type === "table" ? 800 : 400
            setTimeout(sendNextChunk, delay)
          } else {
            console.log("Table-aware streaming complete")
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "finish" })}\n\n`))
            controller.close()
          }
        }

        sendNextChunk()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("=== API ERROR ===")
    console.error("Error:", error)
    console.error("=== END API ERROR ===")

    return new Response(
      JSON.stringify({
        error: `Internal server error: ${error.message}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
