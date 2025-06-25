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
  const tablePattern = /\|.*\|.*\n\s*\|[-\s|:]+\|/
  return tablePattern.test(text)
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

  // Fix table formatting issues
  if (containsTable(cleaned)) {
    console.log("Table detected, applying table-specific fixes...")

    // Fix broken table separators
    cleaned = cleaned.replace(/\|\s*--\s*\|/g, "|---|")
    cleaned = cleaned.replace(/\|\s*--\s*$/gm, "|---|")
    cleaned = cleaned.replace(/^\s*--\s*\|/gm, "|---|")

    // Fix incomplete table headers
    cleaned = cleaned.replace(/\|\s*\|\s*--/g, "|\n|---|")

    // Ensure table rows have proper structure
    const lines = cleaned.split("\n")
    const fixedLines = []
    let inTable = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Detect table start
      if (line.includes("|") && !inTable) {
        inTable = true
      }

      // Detect table end
      if (inTable && line && !line.includes("|")) {
        inTable = false
      }

      if (inTable && line.includes("|")) {
        // Fix table row formatting
        let fixedLine = line

        // Ensure proper spacing around pipes
        fixedLine = fixedLine.replace(/\s*\|\s*/g, " | ")

        // Fix separator rows
        if (fixedLine.includes("--")) {
          const cellCount = (fixedLine.match(/\|/g) || []).length + 1
          fixedLine = "|" + " --- |".repeat(cellCount - 1) + " --- |"
        }

        // Ensure line starts and ends with |
        if (!fixedLine.startsWith("|")) {
          fixedLine = "| " + fixedLine
        }
        if (!fixedLine.endsWith("|")) {
          fixedLine = fixedLine + " |"
        }

        fixedLines.push(fixedLine)
      } else {
        fixedLines.push(line)
      }
    }

    cleaned = fixedLines.join("\n")
  }

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

    // Create a streaming response that sends chunks of the AI response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        console.log("Starting stream...")

        // Check if the response contains tables
        const hasTable = containsTable(cleanedResponse)

        if (hasTable) {
          console.log("Response contains tables, using table-aware streaming...")

          // For responses with tables, send larger chunks to preserve table structure
          const chunks = cleanedResponse.split(/\n\s*\n/).filter((chunk) => chunk.trim().length > 0)
          let chunkIndex = 0

          const sendTableChunk = () => {
            if (chunkIndex < chunks.length) {
              const chunk = chunks[chunkIndex]
              const isLastChunk = chunkIndex === chunks.length - 1

              let textToSend = chunk
              if (!isLastChunk) {
                textToSend += "\n\n"
              }

              const sseChunk = `data: ${JSON.stringify({
                type: "text-delta",
                textDelta: textToSend,
              })}\n\n`

              console.log(`Sending table chunk ${chunkIndex + 1}/${chunks.length}`)
              controller.enqueue(encoder.encode(sseChunk))

              chunkIndex++
              // Slower streaming for tables to ensure proper rendering
              setTimeout(sendTableChunk, 800)
            } else {
              console.log("Table stream complete, closing...")
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "finish" })}\n\n`))
              controller.close()
            }
          }

          sendTableChunk()
        } else {
          // Original streaming logic for non-table content
          const paragraphs = cleanedResponse.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
          let paragraphIndex = 0

          const sendParagraph = () => {
            if (paragraphIndex < paragraphs.length) {
              const paragraph = paragraphs[paragraphIndex].trim()

              let chunks = []

              if (
                paragraph.startsWith("#") ||
                paragraph.match(/^\d+\.\s/) ||
                paragraph.match(/^\*\s/) ||
                paragraph.match(/^-\s/)
              ) {
                chunks = [paragraph]
              } else {
                chunks = paragraph
                  .split(/([.!?]+\s+)/)
                  .reduce((acc, part, index, array) => {
                    if (index % 2 === 0) {
                      const punctuation = array[index + 1] || ""
                      acc.push((part + punctuation).trim())
                    }
                    return acc
                  }, [])
                  .filter((chunk) => chunk.length > 0)
              }

              let chunkIndex = 0

              const sendChunk = () => {
                if (chunkIndex < chunks.length) {
                  const chunk = chunks[chunkIndex]
                  const isLastChunk = chunkIndex === chunks.length - 1
                  const isLastParagraph = paragraphIndex === paragraphs.length - 1

                  let textToSend = chunk
                  if (!isLastChunk) {
                    textToSend += " "
                  } else if (!isLastParagraph) {
                    textToSend += "\n\n"
                  }

                  const sseChunk = `data: ${JSON.stringify({
                    type: "text-delta",
                    textDelta: textToSend,
                  })}\n\n`

                  console.log(
                    `Sending chunk ${chunkIndex + 1}/${chunks.length} from paragraph ${paragraphIndex + 1}/${paragraphs.length}`,
                  )

                  controller.enqueue(encoder.encode(sseChunk))

                  chunkIndex++
                  const delay = chunk.startsWith("#") ? 200 : Math.min(400, Math.max(100, chunk.length * 8))
                  setTimeout(sendChunk, delay)
                } else {
                  paragraphIndex++
                  setTimeout(sendParagraph, 300)
                }
              }

              sendChunk()
            } else {
              console.log("Stream complete, closing...")
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "finish" })}\n\n`))
              controller.close()
            }
          }

          sendParagraph()
        }
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
