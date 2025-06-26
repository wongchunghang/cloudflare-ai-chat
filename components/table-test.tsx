"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MarkdownMessage } from "./markdown-message"

export function TableTest() {
  // Test different table formats
  const simpleTable = `| Feature | Auth0 | Legacy |
| --- | --- | --- |
| Scalability | High | Low |
| Security | Enterprise | Basic |`

  const complexTable = `| **Feature** | **Auth0** | **Legacy Authentication Flows** |
| --- | --- | --- |
| **Scalability** | Highly scalable, with support for millions of users | Limited scalability, often requiring custom development for large user bases |
| **Security** | Meets industry standards for security and compliance, including GDPR, HIPAA, and PCI-DSS. | May not meet these standards or may require additional security measures. |
| **User Management** | Built-in user management, including user registration, login, and profile management | User management is typically handled by the application itself, with potential integration with third-party services |
| **Authentication Protocols** | Supports multiple protocols, including OAuth, OpenID Connect, SAML, and JWT | Typically uses a single protocol, such as username/password or OAuth |`

  const malformedTable = `| Feature | Auth0 | Legacy Authentication Flows |
| --- | --- | --- | --- | --- |
| Scalability | High | Low |
| Security | Enterprise | Basic |`

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Table Rendering Comparison</h1>
        <p className="text-gray-600">Comparing default ReactMarkdown vs Enhanced Tailwind styling</p>
      </div>

      {/* Test 1: Simple Table Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-red-600">❌ Default ReactMarkdown</h2>
          <div className="border border-gray-100 p-4 bg-gray-50 rounded">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{simpleTable}</ReactMarkdown>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-green-600">✅ Enhanced Tailwind Styling</h2>
          <div className="border border-gray-100 p-4 bg-gray-50 rounded">
            <MarkdownMessage content={simpleTable} />
          </div>
        </div>
      </div>

      {/* Test 2: Complex Table Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-red-600">❌ Default (Complex Table)</h2>
          <div className="border border-gray-100 p-4 bg-gray-50 rounded max-h-96 overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{complexTable}</ReactMarkdown>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-green-600">✅ Enhanced (Complex Table)</h2>
          <div className="border border-gray-100 p-4 bg-gray-50 rounded max-h-96 overflow-y-auto">
            <MarkdownMessage content={complexTable} />
          </div>
        </div>
      </div>

      {/* Test 3: Malformed Table */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-orange-600">⚠️ Malformed Table Test</h2>
        <div className="mb-4">
          <h3 className="font-medium text-sm text-gray-600 mb-2">Raw Markdown (Wrong separator):</h3>
          <pre className="bg-gray-100 p-3 text-xs overflow-x-auto rounded border">{malformedTable}</pre>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-sm text-red-600 mb-2">Default Rendering:</h3>
            <div className="border border-gray-100 p-3 bg-gray-50 rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{malformedTable}</ReactMarkdown>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-sm text-green-600 mb-2">Enhanced Rendering:</h3>
            <div className="border border-gray-100 p-3 bg-gray-50 rounded">
              <MarkdownMessage content={malformedTable} />
            </div>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">✨ Enhanced Table Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-green-700 mb-2">✅ What's Improved:</h3>
            <ul className="space-y-1 text-green-600">
              <li>• Professional gradient header background</li>
              <li>• Hover effects on table rows</li>
              <li>• Better border styling and shadows</li>
              <li>• Improved spacing and padding</li>
              <li>• Responsive overflow handling</li>
              <li>• Consistent typography</li>
              <li>• Better visual hierarchy</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-red-700 mb-2">❌ Default Issues:</h3>
            <ul className="space-y-1 text-red-600">
              <li>• Plain, unstyled appearance</li>
              <li>• No visual feedback</li>
              <li>• Basic border styling</li>
              <li>• Inconsistent spacing</li>
              <li>• Poor mobile experience</li>
              <li>• Limited visual appeal</li>
              <li>• Hard to read large tables</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="text-center pt-6 border-t border-gray-200">
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Chat
        </a>
      </div>
    </div>
  )
}
