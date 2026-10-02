# Changelog

All notable changes to samai-sdk are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) formatting and
[Semantic Versioning](https://semver.org/).

While the project is pre-1.0, minor version bumps (0.X.0) may include
breaking changes — these are called out explicitly below. Patch versions
(0.3.X) will not.

## [Unreleased]

### Added
- Graph memory: per-user long-term memory backed by a Neo4j knowledge graph
  (`enableGraphMemory()`), with a private memory agent that writes facts via
  `upsert_fact` (timestamped, contradiction-aware — `applyRecencyDecay()`
  fades and prunes stale ones) and a background sweep that produces running
  context for the main agent (`chatWithMemory()`)
- `createGraphMemoryManager()` — shares a single Neo4j driver/connection pool
  across many users instead of one per user
- `runSelfCorrection()` / `startSelfCorrectionLoop()` — Cypher diagnostics for
  duplicate nodes, overly generic relationship types, and relationship-count
  overload, with a curator agent invoked only when there's something to fix
- `createFeedEngine()` — hybrid social-graph + interest-graph + engagement
  content ranking
- `ensureGraphConstraints()` / `deleteUserGraph()` — DB-level uniqueness
  constraints and a real right-to-be-forgotten function
- `createMetricsCollector()` — shared observability across all of the above
- `neo4j-driver` optional peer dependency (dynamically imported, same pattern
  as `ioredis`/`better-sqlite3` — the rest of the SDK is unaffected if it's
  not installed)

### Changed
-

### Fixed
-

## [0.3.6] - 2026-10-02

OpenAI's Realtime **preview** API is retired, so 0.3.6 moves voice onto the GA
interface and adds a WebRTC transport. A browser app can now depend on
`samai-sdk` alone — no patch-package, no vendored fork, no post-install
patching.

### Added
- **WebRTC transport for OpenAI Realtime.** `OpenAIRealtimeWebRTCTransport`
  (`src/voice/transport/openai-webrtc.ts`) completes the documented SDP
  handshake against `POST /v1/realtime/calls`: it adds the caller's microphone
  track, waits for ICE gathering, POSTs the offer as `application/sdp`, applies
  the answer, and surfaces the assistant's remote `MediaStream` for an `<audio>`
  element. Audio *events* still arrive over the `oai-events` data channel, so
  the transport has the same send/receive surface as the WebSocket one.
  Reachable via `openaiRealtime({ transport: "webrtc", inputStream })`, and
  exported directly from `samai-sdk/voice`.
- `createRealtimeClientSecret()` — mints an ephemeral realtime client secret
  (`ek_...`) from the GA `POST /v1/realtime/client_secrets` endpoint. **Server
  side only**: this is the call that needs `OPENAI_API_KEY`, and the `ek_`
  value it returns is what a browser is allowed to hold. It also accepts
  `expires_after` (TTL) and `OpenAI-Safety-Identifier`.
- Ephemeral-credential support throughout the realtime stack:
  `createRealtimeSession({ clientSecret })` and
  `getEphemeralKey()` (re-mint on reconnect, once the previous secret expired).
- GA turn detection, including `semantic_vad` with `eagerness`, and
  `interrupt_response` barge-in (`RealtimeTurnDetection`).
- `truncateLastResponse(audioEndMs)` on `RealtimeSession` — drops the unplayed
  tail of the assistant's last response from the conversation, so a WebSocket
  client's playback buffer and the model's memory stay in sync on barge-in.
  `interrupt()` calls it for you.
- `RealtimeSession.getConnectionState()` and a `connection` event on
  `RealtimeEvent`, plus `connectTimeoutMs`, so reconnect logic has something to
  hook onto. Transport lifecycle is also surfaced as a `connection-state`
  `VoiceAgentEvent` and as `ConversationEngine` states (`connecting`,
  `reconnecting`, `error`, `user_speaking`, `assistant_speaking`, `interrupting`).
- Streaming caption events on the agent surface: `user-transcript-delta`,
  `assistant-transcript-delta`, `assistant-transcript-done`, and
  `response-cancelled`.
- Browser-safe `samai-sdk/voice` entry. `defineTool`, `defineVoiceAgent`,
  `createRealtimeClientSecret`, `ConversationEngine`, `VoiceActivityDetector`,
  `InterruptionController`, the WebRTC transports, the signaling helpers, and
  the test doubles are all exported from `samai-sdk/voice`, so a client bundle
  never has to reach for the root entry (which pulls in Node-only modules).
- `stopMediaStream()` — releases the microphone when a call ends.
- `check:browser` — bundles `samai-sdk/voice` with esbuild for `platform:
  "browser"` and fails if any Node built-in is reachable, or if the emitted
  JavaScript references `Buffer`/`process` unguarded. Wired into `npm test`.
- `check:exports` — verifies every path in `package.json` (`main`, `module`,
  `types`, `bin`, `exports`, `files`) exists on disk after a build. Wired into
  `prepublishOnly` via `npm run verify`.

### Changed
- **Realtime session config now uses the GA shape**: `session.type: "realtime"`,
  all audio config nested under `session.audio.input` / `session.audio.output`
  (`{ type: "audio/pcm", rate: 24000 }` instead of `"pcm16"`), `output_modalities`,
  and `audio.input.transcription`. Unset fields are omitted from the payload.
- **GA accepts exactly one output modality**, and the session always requests
  `["audio"]`. The preview API's `modalities: ["text", "audio"]` is a 400 on GA.
  Assistant captions are unaffected — the transcript still arrives on
  `response.output_audio_transcript.delta`.
- Default realtime model is now `gpt-realtime` (was `gpt-4o-realtime-preview`).
- Default turn detection is now `semantic_vad` (was `server_vad`), and input
  transcription is on by default (`{ model: "gpt-4o-transcribe" }`) so user
  transcripts arrive without extra configuration. Pass
  `inputAudioTranscription: null` to turn it off.
- Server events are read from the GA names first
  (`response.output_audio.delta`, `response.output_audio_transcript.*`,
  `response.output_text.*`, `response.output_item.done`). The shorter aliases
  are still accepted on *input*, because Azure's own realtime endpoint emits
  them; nothing is ever sent in the retired shape.
- `createRealtimeSession()` prefers the global `WebSocket` (browsers, edge
  runtimes, Node 22+) and falls back to the optional `ws` peer, rather than the
  other way round. Header-based auth is used when `ws` is present; on the
  spec-compliant global `WebSocket` it authenticates via subprotocols, which is
  the documented approach for header-less environments.
- `audio.delta` events carry a `Uint8Array`, not a Node `Buffer`, and
  `sendAudio()` accepts `Uint8Array | ArrayBuffer`. WebSocket realtime also
  de-duplicates function calls, since GA emits both
  `response.function_call_arguments.done` and `response.output_item.done` for
  the same call.

### Fixed
- **`./react-voice` export resolved to a file that never existed.** `package.json`
  pointed at `dist/voice/react/index.*`, but tsup emits `dist/voice/react.*`
  (the entry is `"voice/react"`), so `import "samai-sdk/react-voice"` failed to
  resolve for every consumer. Now points at `./dist/voice/react.d.ts`,
  `./dist/voice/react.js`, and `./dist/voice/react.cjs`.
- `samai-sdk/voice` no longer imports `node:*`. `node:crypto`'s `randomUUID` is
  replaced by a browser-safe `randomUUID()` (`src/uuid.ts`), and `Buffer` usage
  in the audio path by `src/bytes.ts` helpers that work in Node, browsers, and
  edge runtimes. Previously a client bundle failed with `Can't resolve 'fs'` or
  threw `Buffer is not defined` at runtime.
- The optional `@deepgram/sdk` and `elevenlabs` peers are now imported through a
  computed specifier with bundler hints, so a browser bundler no longer tries to
  resolve them at build time when the app never configures them.
- `openaiRealtime({ transport: "webrtc" })` with no `inputStream`, no client
  secret, or no `RTCPeerConnection` now fails with an actionable message instead
  of a `TypeError`.

### Breaking changes
- **The preview Realtime API is no longer supported.** There is no
  `OpenAI-Beta: realtime=v1` header, no `openai-beta.realtime-v1` subprotocol,
  and no preview session/event shape on the wire. This breaks anyone pinned to
  `gpt-4o-realtime-preview` or `gpt-4o-realtime-preview-2024-…`: migrate the
  model to `gpt-realtime` and drop any code that relied on preview-only
  parameters. Note in particular that GA rejects a session asking for both text
  and audio output, and that `modalities` is replaced by `output_modalities`.
- `RealtimeSessionOptions.protocol` (`"ga" | "v1"`) is **removed**. The preview
  protocol it selected is retired; the GA protocol is always used. Other public
  exports are unchanged.
- `RealtimeEvent`'s `audio.delta` payload is a `Uint8Array` rather than a
  `Buffer`. `Buffer.from(event.audio)` still works, but code that relied on
  `Buffer` methods on the event value needs `Uint8Array` methods.
- `RealtimeSession.sendAudio()` is typed `Uint8Array | ArrayBuffer`. `Buffer` is
  a `Uint8Array`, so existing callers are unaffected at runtime.

## [0.3.1] - 2026-08-05

### Added
- Standard Schema support (valibot, etc.) across `generateObject()`,
  `streamObject()`, `createSchemaGuardrail()`, and `Agent.outputSchema`
- `docs/deployment.md` covering Node servers, Node serverless, and edge
  runtimes (Vercel Edge, Cloudflare Workers)

<!--
  Backfill the remaining historical entries below as you're able to
  reconstruct them (0.1.0 through 0.3.0), so users upgrading from an older
  version can see exactly what changed. Suggested sections per release:
  eight provider adapters, agent runtime (defineAgent/runAgent), sessions,
  guardrails package, RAG/vector search, tracing + OTel export, CLI scaffold,
  resumable/checkpointed runs, framework hooks (React/Vue/Svelte).
-->

## [0.1.0] - TBD

### Added
- Initial public release
