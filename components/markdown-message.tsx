import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownMessageProps {
  content: string
  className?: string
}

export function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
  // Pre-process content to handle tables and lists better
  const processedContent = content
    // Convert hyphen bullet points to asterisk bullet points for better Markdown compatibility
    .replace(/^- /gm, "* ")
    .replace(/\n- /g, "\n* ")
    // Ensure proper spacing for lists (but not for tables)
    .replace(/\n\*\s(?!\|)/g, "\n\n* ")
    // Ensure proper spacing for numbered lists
    .replace(/\n(\d+\.\s)/g, "\n\n$1")

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : null

            return !inline && language ? (
              <div className="relative rounded-lg overflow-hidden mb-4">
                {/* Language indicator */}
                <div className="absolute top-0 right-0 bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-bl font-mono">
                  {formatLanguageName(language)}
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 pt-8 rounded-lg overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            )
          },
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 text-gray-900">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 text-gray-900">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-semibold mb-2 mt-3 text-gray-800">{children}</h3>,
          p: ({ children }) => <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-outside mb-3 space-y-1 ml-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside mb-3 space-y-1 ml-4">{children}</ol>,
          li: ({ children }) => <li className="text-gray-700 mb-1 pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-3 bg-gray-50 py-2">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Enhanced table styling with Tailwind
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg shadow-sm border border-gray-200">
              <table className="min-w-full border-collapse bg-white">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gradient-to-r from-gray-50 to-gray-100">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>,
          tr: ({ children, ...props }) => {
            // Check if this is a header row (inside thead)
            const isHeaderRow = props.node?.parent?.tagName === "thead"

            return <tr className={isHeaderRow ? "" : "hover:bg-gray-50 transition-colors duration-150"}>{children}</tr>
          },
          th: ({ children }) => (
            <th className="border-r border-gray-200 last:border-r-0 px-6 py-4 text-left text-sm font-semibold text-gray-900 bg-gray-50">
              <div className="flex items-center space-x-1">
                <span>{children}</span>
              </div>
            </th>
          ),
          td: ({ children }) => (
            <td className="border-r border-gray-200 last:border-r-0 px-6 py-4 text-sm text-gray-700 leading-relaxed">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-gray-300" />,
          // Custom handling for better spacing
          div: ({ children }) => <div className="mb-2">{children}</div>,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

// Helper function to format language names nicely
function formatLanguageName(language: string): string {
  if (!language) return "text"

  // Map of common language identifiers to display names
  const languageMap: Record<string, string> = {
    js: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    py: "Python",
    rb: "Ruby",
    java: "Java",
    go: "Go",
    rs: "Rust",
    cs: "C#",
    cpp: "C++",
    c: "C",
    php: "PHP",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sql: "SQL",
    sh: "Shell",
    bash: "Bash",
    md: "Markdown",
    json: "JSON",
    yaml: "YAML",
    toml: "TOML",
    xml: "XML",
    dockerfile: "Dockerfile",
  }

  return languageMap[language.toLowerCase()] || language.toUpperCase()
}
