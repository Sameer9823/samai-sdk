# Deploying on serverless & edge runtimes

SamAI SDK is plain TypeScript with no framework dependency, so it runs fine on traditional
Node.js servers, Node-based serverless (AWS Lambda, Vercel serverless functions, Google Cloud
Functions), and — for most of the SDK — edge runtimes (Vercel Edge Functions, Cloudflare
Workers, Deno Deploy). The catch is that a handful of pieces reach for Node-only APIs
(`node:fs`, `node:http`, native addons, raw TCP sockets), which don't exist on the edge. This
guide is a compatibility map so you know what to swap out before you deploy, not after a
runtime throws `Cannot find module 'node:fs'` in production.

`AbortController`/`AbortSignal` (used throughout for `timeoutMs`/cancellation) are Web
Platform APIs, not Node-specific — no changes needed there on any runtime.

## Compatibility at a glance

| Piece | Node server | Node serverless (Lambda, Vercel serverless) | Edge (Vercel Edge, Cloudflare Workers) |
|---|---|---|---|
| `openai()`, `groq()`, `mistral()`, `azureOpenAI()`, `ollama()` (all built on the `openai` SDK) | ✅ | ✅ | ✅ — the `openai` SDK is `fetch`-based and edge-tested |
| `anthropic()` | ✅ | ✅ | ✅ — the `@anthropic-ai/sdk` package is `fetch`-based and edge-tested |
| `google()` | ✅ | ✅ | ⚠️ likely works (`@google/generative-ai` is `fetch`-based) but isn't officially edge-certified by Google — test before relying on it |
| `bedrock()` | ✅ | ✅ | ❌ `@aws-sdk/client-bedrock-runtime`'s request signing uses Node's `crypto` module, not the Web Crypto API — will not run on Cloudflare Workers/Vercel Edge |
| `InMemorySessionStore`, `InMemoryCheckpointStore`, `InMemoryVectorStore` | ✅ | ⚠️ works, but state is lost on every cold start/new instance — only useful within a single invocation | ⚠️ same caveat, and even more short-lived |
| `FileSessionStore`, `FileCheckpointStore` | ✅ | ⚠️ Lambda/Vercel give you `/tmp`, which is writable but ephemeral and not shared across instances — fine for scratch/debug, not real persistence | ❌ `node:fs` doesn't exist |
| `SqliteSessionStore` (`better-sqlite3`) | ✅ | ❌ native addon — needs a matching prebuilt binary for the deploy target, and most edge/serverless bundlers can't ship native `.node` files at all | ❌ |
| `RedisSessionStore` (`ioredis`) | ✅ | ✅ (works over normal TCP, same network model as any Node process) | ❌ `ioredis` opens a raw TCP socket to Redis — Cloudflare Workers/Vercel Edge only permit outbound `fetch`/WebSocket, not arbitrary TCP |
| `createWebSearchTool()`, `createRetrievalTool()`, `openaiEmbeddings()` | ✅ | ✅ | ✅ — all `fetch`-based |
| `PineconeVectorStore` | ✅ | ✅ | ✅ — Pinecone's client is `fetch`-based |
| `exportRunTraceToOtel()` | ✅ | ✅ | ⚠️ depends on which `@opentelemetry/sdk-trace-*` exporter you pair it with — the in-memory/console exporters work anywhere, OTLP-over-HTTP exporters need a `fetch`-based one (not the default Node OTLP exporter, which uses `node:http`) |
| `renderTraceHTML()` | ✅ | ✅ | ✅ — pure string generation, no I/O |
| `samai-sdk` CLI (`create`, `trace`) | ✅ | n/a — it's a local dev tool | n/a |
| Everything else (`runAgent`/`runAgentStream`, `generateObject`/`generateObjectBatch`, `streamObject`, handoffs, guardrails, resilience wrappers, `createUsageLedger`) | ✅ | ✅ | ✅ — pure logic over the `Provider`/`SessionStore`/`RunCheckpointStore` interfaces, no I/O of its own |

## The pattern: swap the adapter, not your code

Every piece of state the SDK touches — sessions, checkpoints, vector storage — is defined as a
small interface (`SessionStore`, `RunCheckpointStore`, `VectorStore`), and the run loop only
ever talks to that interface. This is deliberate: it means going edge-compatible is usually a
matter of swapping *which implementation* you construct, not rewriting how you call `runAgent()`.

If you need session persistence on Cloudflare Workers, for example, `SessionStore` is only three
methods — implement it against Cloudflare KV or Durable Objects directly:

```ts
import type { SessionStore, Message } from "samai-sdk";

function createCloudflareKvSessionStore(kv: KVNamespace): SessionStore {
  return {
    async getMessages(sessionId) {
      const raw = await kv.get(sessionId);
      return raw ? (JSON.parse(raw) as Message[]) : [];
    },
    async appendMessages(sessionId, messages) {
      const existing = await kv.get(sessionId);
      const current: Message[] = existing ? JSON.parse(existing) : [];
      await kv.put(sessionId, JSON.stringify([...current, ...messages]));
    },
    async clear(sessionId) {
      await kv.delete(sessionId);
    },
  };
}
```

The same approach works for `RunCheckpointStore` (checkpoint/resume) against any HTTP-reachable
store — Cloudflare KV/Durable Objects, Upstash Redis (which is `fetch`-based, unlike `ioredis`),
Vercel KV, or a plain database over `fetch`.

## Environment variables on the edge

Every provider factory falls back to `process.env.*` for API keys when you don't pass one
explicitly (e.g. `groq()` reads `GROQ_API_KEY`). Vercel Edge Functions expose `process.env`, but
Cloudflare Workers do not by default — env vars there arrive through the `env` binding passed
into your `fetch` handler instead. On Cloudflare Workers, always pass the API key explicitly
rather than relying on the `process.env` fallback:

```ts
export default {
  async fetch(request: Request, env: { GROQ_API_KEY: string }) {
    const provider = groq({ apiKey: env.GROQ_API_KEY }); // don't rely on process.env here
    // ...
  },
};
```

## Recipes

### Vercel Edge Function

```ts
export const config = { runtime: "edge" };

import { createClient, defineAgent, runAgent, anthropic, InMemorySessionStore, createSession } from "samai-sdk";

const client = createClient({ provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });
const agent = defineAgent({ name: "assistant", instructions: "Be helpful and concise.", model: "claude-sonnet-4-6" });

export default async function handler(req: Request) {
  const { input, sessionId } = await req.json();
  // InMemorySessionStore only lasts for this invocation — swap in a fetch-based store
  // (Vercel KV, Upstash Redis) if you need history to survive across requests.
  const session = createSession(sessionId, new InMemorySessionStore());
  const result = await runAgent(client, agent, input, { session });
  return Response.json({ output: result.output });
}
```

### Cloudflare Worker

```ts
import { createClient, defineAgent, runAgent, groq } from "samai-sdk";

export default {
  async fetch(request: Request, env: { GROQ_API_KEY: string }) {
    const client = createClient({ provider: groq({ apiKey: env.GROQ_API_KEY }) });
    const agent = defineAgent({ name: "assistant", instructions: "Be helpful and concise.", model: "llama-3.3-70b-versatile" });
    const { input } = await request.json();
    const result = await runAgent(client, agent, input);
    return Response.json({ output: result.output });
  },
};
```

Avoid `bedrock()`, `SqliteSessionStore`, `RedisSessionStore`, `FileSessionStore`, and
`FileCheckpointStore` in a Cloudflare Worker per the compatibility table above — use `bedrock()`
only on a Node runtime, and swap the stores for a `fetch`-based implementation as shown earlier.

### Node.js serverless (AWS Lambda, Vercel serverless functions)

No changes needed from a plain Node server — every part of the SDK, including `bedrock()`,
`SqliteSessionStore`, and `RedisSessionStore`, runs as-is. The one thing to plan for is that
these platforms don't guarantee a warm instance between invocations: `InMemorySessionStore`/
`InMemoryCheckpointStore` won't reliably persist across requests, so use `RedisSessionStore`,
`SqliteSessionStore` pointed at a mounted volume, or your own `SessionStore`/`RunCheckpointStore`
backed by a real database if you need state to survive between calls.
