# Changelog

## 0.5.0

### Added

- **Voice / realtime agents — `generateSpeech()`, `transcribeAudio()`, `createRealtimeSession()`.**
  The third structural gap from the original competitive review is now closed.

  - `generateSpeech(options)` — text-to-speech via OpenAI's `/audio/speech` endpoint. A real
    HTTP call, same pattern as `createWebSearchTool()`.
  - `transcribeAudio(options)` — speech-to-text via OpenAI's `/audio/transcriptions` (Whisper)
    endpoint. Also a real HTTP call, multipart upload.
  - `createRealtimeSession(options)` — a WebSocket wrapper around OpenAI's Realtime API:
    streamed audio/text/transcript deltas, server-side voice-activity detection,
    `interrupt()` for single-call barge-in cancellation, and automatic tool-call execution
    against a normal `ToolDefinition[]` (function-call arguments are executed via each tool's
    `.execute()` and the result is sent back to continue the response — no manual event
    handling needed for that path). Prefers the optional `ws` peer dependency for header-based
    auth; falls back to the global `WebSocket` (stable in Node 22+) using OpenAI's documented
    subprotocol-based auth when `ws` isn't installed, since the standard WebSocket API can't
    send custom headers at all (a browser restriction Node's built-in implementation also
    follows).

  **Verification status — read this before relying on it in production.** `api.openai.com` is
  not reachable from the environment this was built in, so unlike this SDK's other integrations,
  none of the three exports above have been run against a live OpenAI connection.
  `generateSpeech`/`transcribeAudio` are low-risk (a `fetch()` against a documented REST shape).
  `createRealtimeSession()`'s wire-protocol *plumbing* was verified against a real local mock
  WebSocket server built for this purpose (`examples/voice-usage-test.ts`), which caught two
  real bugs during development, both fixed before release: `connect()` was resolving as soon as
  `session.update` was *sent*, not once the server actually confirmed the session (a race
  condition — code could start sending audio/text before the session was configured); and the
  originally-implemented header-passing approach silently no-opped when falling back to the
  standard `WebSocket` global, since it can't carry custom headers at all. What remains
  unverified is whether OpenAI's live server uses exactly the event names/fields implemented
  here, since that API surface moves quickly — see the disclaimer at the top of `src/voice.ts`.

## 0.4.0

### Added

- **Sandboxed code execution — `createSandbox()`, `createCodeExecutionTool()`, `createSandboxTools()`.**
  The second-largest structural gap against other agent SDKs (OpenAI's sandboxed agent tooling,
  Vercel's Sandbox) is now closed: agents can run real JavaScript/Python/bash and read/write
  files in an isolated working directory across multiple tool calls within a run — the
  "inspect files, run commands, edit code" pattern long-horizon coding agents need.

  - `createSandbox(options)` — the low-level primitive. Each instance gets a dedicated temp
    directory (or a caller-supplied one), a minimal environment (`PATH`/`HOME`/`TMPDIR` only —
    the rest of your process's env, including API keys, is not inherited by executed code), a
    wall-clock timeout enforced via `SIGKILL`, and a byte-accurate output-truncation cap.
    `writeFile`/`readFile`/`listFiles` are confined to the sandbox root (path traversal via
    `../` is rejected, as is an absolute path outside it).
  - `createCodeExecutionTool(options)` — wraps a sandbox as a single `execute_code`
    `ToolDefinition`, ready to drop into an agent's `tools` array.
  - `createSandboxTools(sandboxOrOptions)` — bundles `execute_code` with `write_file`,
    `read_file`, and `list_files` against one shared sandbox, so a model can write a file with
    one tool and run it with another.
  - Explicitly scoped as **process-level** isolation, not OS-level — no container, VM, or
    network namespace. Documented clearly (in the module doc comment, the README, and the tool
    descriptions the model itself sees) as suitable for trusted/self-use, not a substitute for a
    real container/VM boundary around untrusted or multi-tenant code.
  - Verified against real spawned `node`/`python3`/`bash` child processes (not mocked): stdout/
    stderr/exit-code capture across all three languages, an actually-enforced timeout (a real
    `sleep 10` killed well under its wall-clock budget), byte-accurate output truncation (fixed a
    real bug during development where a single large stdout chunk could overshoot the cap before
    truncation kicked in), path-traversal rejection, cross-tool file sharing, and verification
    that a secret set in the *parent* process's environment does not leak into executed code. See
    `examples/sandbox-usage-test.ts` and the agent-integration example
    `examples/sandbox-agent-usage.ts`.

## 0.3.0

### Added

- **MCP (Model Context Protocol) client — `createMCPClient()`.** Connects to any MCP server and
  exposes its tools as ordinary `ToolDefinition`s, usable anywhere a tool is accepted
  (`defineAgent()`, `generateText()`, mixed in with local tools, `createWebSearchTool()`,
  `createRetrievalTool()`, etc). This was the largest structural gap against other agent SDKs
  (OpenAI's Agents SDK, Vercel's AI SDK) and is now closed.

  - Three transports: `{ transport: "stdio", command, args, env, cwd }` for a locally-spawned
    server process, `{ transport: "http", url, headers }` for the current MCP Streamable HTTP
    transport, and `{ transport: "sse", url, headers }` for the legacy SSE transport some older
    servers still expose.
  - `toolPrefix` namespaces every tool pulled from a server (`"github"` → `"github__search_issues"`)
    so multiple MCP servers wired into one agent can't collide on tool names.
  - `requiresApproval` (boolean or a `(toolName, args) => boolean | Promise<boolean>` predicate)
    gates every tool from a server behind the same human-approval flow as any other tool.
  - Requires the optional `@modelcontextprotocol/sdk` peer dependency; imported dynamically, same
    pattern as `RedisSessionStore`/`SqliteSessionStore`, so the rest of the SDK works fine without
    it installed.
  - Each MCP tool's JSON Schema reaches the model exactly as the server declared it — see
    "Changed" below for how.
  - Verified against a real local MCP server over a real stdio subprocess (not a mocked
    transport): tool discovery, structured-content and text-only call results, and `isError` →
    thrown-`Error` propagation. See `examples/mcp-usage-test.ts` (fixture server:
    `examples/fixtures/mcp-test-server.ts`) and the agent-integration example
    `examples/mcp-agent-usage.ts`.

### Changed

- **`ToolDefinition` gained an optional `rawJsonSchema` field** — an escape hatch for tools whose
  parameter shape is already known as JSON Schema rather than zod (MCP tools being the motivating
  case). When set, all four provider adapters that build a model-facing tool schema
  (`openai-compatible`, `anthropic`, `google`, `bedrock`) send it as-is instead of deriving one
  from `parameters` via `zodToJsonSchema()`, via a new shared `toolParametersJsonSchema()` helper
  in `schema-adapter.ts`. No behavior change for existing zod-defined tools — this is purely
  additive, and every provider was updated to go through the same helper so this can't drift
  per-provider in the future.

## 0.2.0

### Fixed

- **`defineTool` generic inference** — `parameters`/`execute` no longer collapse to `unknown`
  when using a `z.object()` schema. The previous signature asked TypeScript to solve for the
  argument type (`Args`) by unifying a concrete `ZodObject` against zod's 3-parameter
  `ZodType<Output, Def, Input>`, which is expensive enough to hit
  `TS2589: Type instantiation is excessively deep and possibly infinite` and silently fall back
  to `unknown`. `defineTool` now infers the whole schema type directly and derives the argument
  type from it via `z.infer<Schema>`, which only ever requires one concrete inference step.

  ```ts
  // This now works with full inference, no casts required:
  const tool = defineTool({
    name: "get_weather",
    description: "Get the current weather for a city",
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => {
      // city is inferred as string
      return { city, tempC: 22 };
    },
  });
  ```

### Changed — ⚠️ dependency contract

- **`zod` is now a required `peerDependency` instead of a bundled `dependency`.** Previously the
  SDK shipped its own copy of zod, which meant a consumer project could end up with two separate,
  physically distinct zod installs — the SDK's own and whatever version the consumer installed
  directly. When those two versions differed even slightly, TypeScript would compare two
  structurally-similar-but-distinct `ZodType`/`ZodObject` declarations, which (combined with
  zod's deeply recursive internal types) could itself trigger `TS2589`, or in stricter tsconfig
  setups (`skipLibCheck: true`), an out-of-memory crash during typecheck.

  **Action required for consumers upgrading:** add `zod` to your own `package.json` if it isn't
  already there:

  ```bash
  npm install zod@^3.23.8
  ```

  If you already depend on zod directly (as most consumers using `defineTool`/`generateObject`
  do), no action is needed — npm will simply stop installing a second copy.

  Fixes [#issue](https://github.com/Sameer9823/samai-sdk/issues) — "TypeScript Typing Issue with
  `defineTool` and Zod".
