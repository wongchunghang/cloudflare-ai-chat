import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
// Fix: Import from CJS version instead of ESM
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter/dist/cjs/prism"
import { tomorrow } from "react-syntax-highlighter/dist/cjs/styles/prism"

interface MarkdownMessageProps {
  content: string
  className?: string
}

export function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
  // Pre-process content to convert hyphen lists to asterisk lists for better Markdown compatibility
  const processedContent = content
    // Convert hyphen bullet points to asterisk bullet points for better Markdown compatibility
    .replace(/^- /gm, "* ")
    .replace(/\n- /g, "\n* ")
    // Ensure proper spacing for lists
    .replace(/\n\*\s/g, "\n\n* ")
    // Ensure proper spacing for numbered lists
    .replace(/\n(\d+\.\s)/g, "\n\n$1")

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            return !inline && match ? (
              <SyntaxHighlighter style={tomorrow} language={match[1]} PreTag="div" className="rounded-md" {...props}>
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
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
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-gray-300">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">{children}</th>
          ),
          td: ({ children }) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
          hr: () => <hr className="my-4 border-gray-300" />,
          // Custom handling for better spacing
          div: ({ children }) => <div className="mb-2">{children}</div>,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
