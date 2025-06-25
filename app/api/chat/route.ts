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

// Helper function to detect if content contains tables
function containsTable(text: string): boolean {
  // Look for table patterns
  const tablePattern = /\|.*\|/
  return tablePattern.test(text)
}

// Helper function to fix a single table row
function fixTableRow(row: string): string {
  if (!row.includes("|")) return row

  let fixed = row.trim()

  // Handle separator rows
  if (fixed.includes("--") || fixed.includes("-")) {
    // Count expected columns from the row structure
    const pipes = (fixed.match(/\|/g) || []).length
    const expectedCols = pipes > 0 ? pipes + 1 : 3 // Default to 3 columns if unclear

    // Create proper separator row
    fixed = "|" + " --- |".repeat(expectedCols - 1) + " --- |"
    return fixed
  }

  // Ensure row starts and ends with |
  if (!fixed.startsWith("|")) {
    fixed = "| " + fixed
  }
  if (!fixed.endsWith("|")) {
    fixed = fixed + " |"
  }

  // Clean up spacing around pipes
  fixed = fixed.replace(/\s*\|\s*/g, " | ")

  // Fix double pipes
  fixed = fixed.replace(/\|\s*\|\s*/g, " | ")

  return fixed
}

// Helper function to parse and fix table structure
function parseAndFixTable(tableText: string): string[] {
  const lines = tableText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const fixedRows = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.includes("|")) {
      const fixedRow = fixTableRow(line)
      fixedRows.push(fixedRow)

      // If this is the first data row (header), add separator if missing
      if (i === 0 && lines.length > 1) {
        const nextLine = lines[i + 1]
        if (!nextLine.includes("--") && !nextLine.includes("-")) {
          // Count columns in header to create proper separator
          const colCount = (fixedRow.match(/\|/g) || []).length - 1
          const separator = "|" + " --- |".repeat(colCount) + " --- |"
          fixedRows.push(separator)
        }
      }
    }
  }

  return fixedRows
}

// Helper function to clean and normalize response text
function cleanResponseText(text: string): string {
  // First, handle literal escape sequences
  let cleaned = text
    .replace(/\\n/g, "\n") // Convert literal \n to newlines
    .replace(/\\t/g, "\t") // Convert literal \t to tabs
    .replace(/\\r/g, "\r") // Convert literal \r to carriage returns
    .replace(/\\\\/g, "\\") // Convert double backslashes to single
    .replace(/\\"/g, '"') // Convert escaped quotes
    .replace(/^\s*["']|["']\s*$/g, "") // Remove surrounding quotes
    .trim()

  // Fix hyphen-style bullet points (common in Llama 3.1 70B)
  // Look for lines starting with "- " and ensure they have proper line breaks
  cleaned = cleaned.replace(/([^\n])(- )/g, "$1\n\n$2")

  // Ensure bullet points have proper spacing
  cleaned = cleaned.replace(/\n- /g, "\n\n- ")

  // Fix numbered lists that might be missing line breaks
  cleaned = cleaned.replace(/(\d+\.\s+[^\n]+)(\d+\.\s+)/g, "$1\n\n$2")

  // Fix consecutive headers that might be missing line breaks
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(\*\*)/g, "$1\n\n$2")

  return cleaned
}

// Helper function to split content into streamable chunks with table awareness
function createStreamableChunks(text: string): Array<{ type: string; content: string }> {
  const chunks = []
  const lines = text.split("\n")
  let currentChunk = ""
  let inTable = false
  let tableRows = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect table start
    if (line.includes("|") && !inTable) {
      // Flush any existing content
      if (currentChunk.trim()) {
        chunks.push({ type: "text", content: currentChunk.trim() })
        currentChunk = ""
      }
      inTable = true
      tableRows = [line]
    }
    // Continue collecting table rows
    else if (inTable && line.includes("|")) {
      tableRows.push(line)
    }
    // Detect table end
    else if (inTable && !line.includes("|")) {
      // Process the complete table
      const fixedTableRows = parseAndFixTable(tableRows.join("\n"))
      for (const row of fixedTableRows) {
        chunks.push({ type: "table-row", content: row })
      }
      inTable = false
      tableRows = []

      // Start new text chunk
      if (line.trim()) {
        currentChunk = line
      }
    }
    // Regular text line
    else if (!inTable) {
      currentChunk += (currentChunk ? "\n" : "") + line
    }
  }

  // Handle any remaining table
  if (inTable && tableRows.length > 0) {
    const fixedTableRows = parseAndFixTable(tableRows.join("\n"))
    for (const row of fixedTableRows) {
      chunks.push({ type: "table-row", content: row })
    }
  }

  // Handle any remaining text
  if (currentChunk.trim()) {
    chunks.push({ type: "text", content: currentChunk.trim() })
  }

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
      ...(model && { model }), // Include model if specified
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

      // Extract response using the robust extraction function
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

    // Create streamable chunks
    const streamChunks = createStreamableChunks(cleanedResponse)
    console.log("=== STREAM CHUNKS ===")
    console.log("Total chunks:", streamChunks.length)
    streamChunks.forEach((chunk, i) => {
      console.log(`Chunk ${i + 1}: ${chunk.type} - "${chunk.content.substring(0, 50)}..."`)
    })
    console.log("=== END STREAM CHUNKS ===")

    // Create a streaming response that sends chunks of the AI response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        console.log("Starting intelligent stream...")

        let chunkIndex = 0

        const sendNextChunk = () => {
          if (chunkIndex < streamChunks.length) {
            const chunk = streamChunks[chunkIndex]
            const isLastChunk = chunkIndex === streamChunks.length - 1

            let textToSend = chunk.content
            if (!isLastChunk && chunk.type === "text") {
              textToSend += "\n\n"
            } else if (!isLastChunk && chunk.type === "table-row") {
              textToSend += "\n"
            }

            const sseChunk = `data: ${JSON.stringify({
              type: "text-delta",
              textDelta: textToSend,
            })}\n\n`

            console.log(
              `Sending ${chunk.type} chunk ${chunkIndex + 1}/${streamChunks.length}: "${chunk.content.substring(0, 50)}..."`,
            )
            controller.enqueue(encoder.encode(sseChunk))

            chunkIndex++

            // Adjust timing based on content type
            const delay = chunk.type === "table-row" ? 300 : chunk.type === "text" ? 500 : 200
            setTimeout(sendNextChunk, delay)
          } else {
            console.log("Intelligent stream complete, closing...")
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
