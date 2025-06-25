"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function TableTest() {
  // Test different table formats
  const simpleTable = `| Feature | Auth0 | Legacy |
| --- | --- | --- |
| Scalability | High | Low |
| Security | Enterprise | Basic |`

  const complexTable = `| **Feature** | **Auth0** | **Legacy Authentication Flows** |
| --- | --- | --- |
| **Scalability** | Highly scalable, with support for millions of users | Limited scalability, often requiring custom development for large user bases |
| **Security** | Meets industry standards for security and compliance, including GDPR, HIPAA, and PCI-DSS. | May not meet these standards or may require additional security measures. |`

  const malformedTable = `| Feature | Auth0 | Legacy Authentication Flows |
| --- | --- | --- | --- | --- |
| Scalability | High | Low |
| Security | Enterprise | Basic |`

  const rawHtml = `
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Auth0</th>
          <th>Legacy</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Scalability</td>
          <td>High</td>
          <td>Low</td>
        </tr>
        <tr>
          <td>Security</td>
          <td>Enterprise</td>
          <td>Basic</td>
        </tr>
      </tbody>
    </table>
  `

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Table Rendering Tests</h1>

      {/* Test 1: Simple Table */}
      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test 1: Simple Table</h2>
        <div className="mb-4">
          <h3 className="font-medium">Raw Markdown:</h3>
          <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{simpleTable}</pre>
        </div>
        <div>
          <h3 className="font-medium">Rendered:</h3>
          <div className="border border-gray-200 p-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{simpleTable}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Test 2: Complex Table */}
      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test 2: Complex Table</h2>
        <div className="mb-4">
          <h3 className="font-medium">Raw Markdown:</h3>
          <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{complexTable}</pre>
        </div>
        <div>
          <h3 className="font-medium">Rendered:</h3>
          <div className="border border-gray-200 p-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{complexTable}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Test 3: Malformed Table */}
      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test 3: Malformed Table (Wrong Separator)</h2>
        <div className="mb-4">
          <h3 className="font-medium">Raw Markdown:</h3>
          <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{malformedTable}</pre>
        </div>
        <div>
          <h3 className="font-medium">Rendered:</h3>
          <div className="border border-gray-200 p-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{malformedTable}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Test 4: Raw HTML Table */}
      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test 4: Raw HTML Table</h2>
        <div className="mb-4">
          <h3 className="font-medium">Raw HTML:</h3>
          <pre className="bg-gray-100 p-2 text-sm overflow-x-auto">{rawHtml}</pre>
        </div>
        <div>
          <h3 className="font-medium">Rendered:</h3>
          <div className="border border-gray-200 p-2" dangerouslySetInnerHTML={{ __html: rawHtml }} />
        </div>
      </div>

      {/* Test 5: Manual Table Component */}
      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test 5: Manual Table Component</h2>
        <div>
          <h3 className="font-medium">Rendered with Tailwind:</h3>
          <div className="border border-gray-200 p-2">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Feature</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Auth0</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Legacy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Scalability</td>
                  <td className="border border-gray-300 px-4 py-2">High</td>
                  <td className="border border-gray-300 px-4 py-2">Low</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Security</td>
                  <td className="border border-gray-300 px-4 py-2">Enterprise</td>
                  <td className="border border-gray-300 px-4 py-2">Basic</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Test 6: Debug Info */}
      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test 6: Debug Information</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>remarkGfm plugin loaded:</strong> {remarkGfm ? "Yes" : "No"}
          </p>
          <p>
            <strong>ReactMarkdown version:</strong> Check package.json
          </p>
          <p>
            <strong>Browser:</strong> {typeof window !== "undefined" ? navigator.userAgent : "Server"}
          </p>
        </div>
      </div>
    </div>
  )
}
