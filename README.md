# Get Started for CH AI Assistant

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/wongchunghangs-projects/v0-simple-next-js)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/ysPulsovW1v)

# Ai Chatbot built using Next.js and Cloudflare AI worker API

A modern, responsive AI chatbot built with Next.js that leverages Cloudflare Workers AI for inference. This project demonstrates how to create a streaming AI chat interface that supports multiple AI models through Cloudflare's AI platform.

![Chatbot Screenshot](https://media.licdn.com/dms/image/v2/D5622AQG2eZo4Lbzd6A/feedshare-shrink_800/B56Zehh7.sG0Ag-/0/1750761718352?e=1753920000&v=beta&t=e2Y5z_m2h2sgarg0lCXHQqHZwUGuBB9SxmOBcaT0mkk)

## Features

- 🚀 **Multi-model support**: Switch between different Cloudflare AI models (Llama, Mistral, etc.)
- 📝 **Markdown rendering**: Properly formats AI responses with Markdown, including code blocks
- ⚡ **Streaming responses**: Real-time streaming of AI responses for better user experience
- 🔄 **Robust error handling**: Graceful handling of various response formats and errors
- 📱 **Responsive design**: Works on desktop and mobile devices
- 🌓 **Dark mode support**: Automatically adapts to system preferences
- ⌨️ **Multiline input**: Supports multiline text input with Ctrl+Enter submission
- 📊 **Character limits**: Enforces character limits with visual feedback
- 📋 **Copy functionality**: One-click copying of AI responses

## Requirements

- Node.js 18+ and npm/yarn/pnpm
- Cloudflare account with Workers AI access
- Vercel account for deployment

## Implementation Guide

### Frontend Implementation (Next.js)

The frontend is built with Next.js App Router and uses the following key components:

1. **Chat Interface (`app/page.tsx`)**: 
   - Manages chat state and user interactions
   - Handles streaming responses from the API
   - Provides model selection and settings
   - Implements multiline input with character limits

2. **API Route (`app/api/chat/route.ts`)**: 
   - Forwards requests to Cloudflare Worker
   - Processes and streams responses back to the client
   - Handles different response formats from various models
   - Implements error handling and response cleaning

3. **Markdown Rendering (`components/markdown-message.tsx`)**: 
   - Renders AI responses with proper Markdown formatting
   - Supports code syntax highlighting
   - Handles different list formats and styling

### Cloudflare Worker Implementation

The Cloudflare Worker serves as the AI inference endpoint. Here's a basic implementation:

\\\js
// Example Cloudflare Worker code (worker.js)
export default {
  async fetch(request, env) {
    // Handle CORS for cross-origin requests
    if (request.method === "OPTIONS") {
      return handleCORS();
    }

    try {
      // Parse the request body
      const { prompt, model = "@cf/meta/llama-3.1-8b-instruct" } = await request.json();
      
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Prompt is required" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Call Cloudflare AI with the specified model
      const aiResponse = await env.AI.run(model, {
        prompt: prompt,
        max_tokens: 1024
      });

      // Return the AI response
      return new Response(JSON.stringify({ result: aiResponse }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
\\\

#### Key Worker Implementation Details:

1. **AI Model Selection**: 
   - The worker accepts a `model` parameter to specify which Cloudflare AI model to use
   - Defaults to Llama 3.1 8B if not specified

2. **Error Handling**: 
   - Implements try/catch blocks to handle errors gracefully
   - Returns appropriate HTTP status codes and error messages

3. **CORS Support**: 
   - Includes CORS headers to allow cross-origin requests
   - Handles OPTIONS preflight requests

4. **Response Format**: 
   - Returns responses in a consistent JSON format
   - Includes the AI-generated text in the `result` field

## Setup and Deployment

### Local Development

1. **Clone the repository**:
   \\\bash
   git clone https://github.com/yourusername/nextjs-cloudflare-ai-chatbot.git
   cd nextjs-cloudflare-ai-chatbot
   \\\

2. **Install dependencies**:
   \\\bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   \\\

3. **Set up environment variables**:
   Create a `.env.local` file in the project root:
   \\\
   CLOUDFLARE_WORKER_URL=https://your-worker-url.workers.dev
   \\\

4. **Run the development server**:
   \\\bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   \\\

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Deploying the Cloudflare Worker

1. **Install Wrangler CLI**:
   \\\bash
   npm install -g wrangler
   \\\

2. **Create a new Worker**:
   \\\bash
   wrangler init ai-chatbot-worker
   \\\

3. **Configure `wrangler.toml`**:
   \\\toml
   name = "ai-chatbot-worker"
   main = "src/worker.js"
   compatibility_date = "2023-10-30"

   [ai]
   binding = "AI"
   \\\

4. **Deploy the Worker**:
   \\\bash
   wrangler deploy
   \\\

5. **Note the Worker URL**:
   After deployment, note the URL of your Worker (e.g., `https://ai-chatbot-worker.yourusername.workers.dev`)

### Deploying to Vercel

1. **Push your code to GitHub**:
   Create a GitHub repository and push your code.

2. **Connect to Vercel**:
   - Go to [Vercel](https://vercel.com) and sign in
   - Click "New Project" and import your GitHub repository
   - Configure the project settings

3. **Set environment variables**:
   Add the following environment variable in the Vercel project settings:
   \\\
   CLOUDFLARE_WORKER_URL=https://your-worker-url.workers.dev
   \\\

4. **Deploy**:
   Click "Deploy" and wait for the deployment to complete.

5. **Access your deployed chatbot**:
   Once deployed, you can access your chatbot at the Vercel-provided URL.

## Configuration Options

### Available Models

The chatbot supports various Cloudflare AI models:

| Model ID | Description |
|----------|-------------|
| `@cf/meta/llama-3.1-8b-instruct` | Llama 3.1 8B (Default) |
| `@cf/meta/llama-3.1-70b-instruct` | Llama 3.1 70B |
| `@cf/meta/llama-3-8b-instruct` | Llama 3 8B |
| `@cf/mistral/mistral-7b-instruct-v0.1` | Mistral 7B |
| `@cf/microsoft/phi-2` | Microsoft Phi-2 |
| `@cf/qwen/qwen1.5-14b-chat-awq` | Qwen 1.5 14B |
| `@cf/google/gemma-7b-it` | Google Gemma 7B |

You can add or remove models by modifying the `AVAILABLE_MODELS` array in `app/page.tsx`.

### Character Limits

The default character limit is set to 8,000 characters. You can adjust this by changing the `MAX_INPUT_CHARS` constant in `app/page.tsx`.

## Troubleshooting

### Common Issues

1. **"Worker error" message**:
   - Verify your Cloudflare Worker URL is correct in `.env.local`
   - Check if your Worker has the necessary AI binding
   - Examine the Cloudflare Worker logs for errors

2. **Streaming not working**:
   - Ensure your browser supports Server-Sent Events
   - Check if your Cloudflare Worker is returning the correct headers
   - Verify the API route is properly handling the streaming response

3. **Markdown rendering issues**:
   - Check the response format from the AI model
   - Inspect the `markdown-message.tsx` component for proper handling
   - Consider adding additional preprocessing for specific model outputs

4. **Model not available**:
   - Verify you have access to the specific model in your Cloudflare account
   - Check if the model ID is correct in the `AVAILABLE_MODELS` array

### Debugging Tips

1. **Enable console logging**:
   - Check browser console for frontend errors
   - Use `wrangler tail` to view Cloudflare Worker logs

2. **Test API directly**:
   - Use tools like Postman or cURL to test your Cloudflare Worker directly
   - Verify the response format matches what your frontend expects

3. **Inspect network requests**:
   - Use browser developer tools to inspect the network requests
   - Check for any errors or unexpected response formats

## License

MIT

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare AI](https://developers.cloudflare.com/workers-ai/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
