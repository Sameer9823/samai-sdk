# Changelog

All notable changes to samai-sdk are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) formatting and
[Semantic Versioning](https://semver.org/).

While the project is pre-1.0, minor version bumps (0.X.0) may include
breaking changes — these are called out explicitly below. Patch versions (0.3.X)
are bug-fix only EXCEPT 0.3.7, which contains security-driven breaking changes
listed under "Breaking changes".

## [Unreleased]

## [0.3.7] - 2026-10-13

### Security
Fixed before any published version contained them (0.3.6 and earlier are
unaffected):
- `read_user_facts`: the `relationType` parameter is now validated against a
  strict identifier pattern (`/^[A-Z][A-Z0-9_]{0,63}$/`) before it is placed in
  the query; invalid values are rejected and no query is sent. Previously the
  value was interpolated directly, allowing Cypher injection (e.g.
  `LIKES) DETACH DELETE n`).
- `assertSafeRawCypher` (the opt-in raw-Cypher guard): single-pass tokenizer
  correctly distinguishes `//` inside a string literal from a comment start;
  query must reference `$userId`; write clauses (CREATE, SET, DELETE, etc.)
  are blocked; every MATCH pattern must start from an anchored
  `(u:User {id: $userId})` node or a variable bound to one.
- Graph-memory tools always bind `$userId` **last** in the params object
  (`{ ...(params ?? {}), userId }`), so a model-supplied `params.userId` can no
  longer override the session owner's ID.
- Raw Cypher sessions open in `READ` access mode
  (`defaultAccessMode: "READ"`). The guard is best-effort — not tenant
  isolation. Production multi-tenant deployments must enforce isolation in the
  database (per-user database or Neo4j roles).

### Breaking changes
- `execute_cypher_query` is removed from the default graph-memory tool set.
  Set `enableGraphMemory({ unsafeRawCypher: true })` to opt back in — its session
  is opened with `defaultAccessMode: READ`, and queries are checked by a
  best-effort guard (single-pass tokenizer, write-clause blocking, every MATCH
  must start from the anchored `(u:User {id: $userId})` node or a variable bound
  to it).
- `upsert_fact` now MERGEs object nodes with a per-user `ownerId` property.
  Existing cross-user shared nodes are **not** split on first upsert — run
  `migrateToPerUserNodes({ dryRun: true })` to audit, then call it again
  without `dryRun` to clone shared nodes per user and re-point relationships.
- Deepgram, ElevenLabs, and `openaiRealtime()` still fall back to `process.env`
  to resolve the API key, but now throw at `connect()` time when neither `apiKey`
  nor the relevant environment variable is set, instead of silently returning a mock
  session. Use `apiKey: "mock"` in tests.

### Added
- `migrateToPerUserNodes({ dryRun?: boolean })` — scans for object nodes
  without `ownerId`, reports how many need migration, and (when `dryRun` is false)
  sets `ownerId` on single-owner nodes and clones multi-owner nodes per user.
- `assertSafeRawCypher()` — exported from `samai-sdk`; guards raw Cypher with
  read-only sessions, single-pass comment/string neutralising, mutation keyword
  blocking, and mandatory `:User` anchoring.
- `.gitattributes` normalizing line endings to LF (`* text=auto eol=lf`).
- `runAgent()` accepts `metadata` so `createUsageLedger` can attribute agent
  runs.
- `samai-sdk create` scaffolds the current version with `zod` and the selected
  provider SDK; scaffold GitHub URLs corrected.
- Trace viewer (`samai-sdk trace <file.json>`) binds to `127.0.0.1` and accepts
  absolute paths via `resolve()`.

### Changed
- **Per-user object nodes**: `upsert_fact` and all graph-memory tools now MERGE
  object nodes (Topic, Post, etc.) with `ownerId: $userId`, so two users with
  the same fact name get distinct nodes.
- **Fixed tool set**: graph-memory tools (`upsert_fact`, `read_user_facts`,
  `delete_user_fact`) are parameterized and always anchored on the `:User` node.
- `read_user_facts` and the feed query now use `LIMIT toInteger($limit)` instead
  of relying on `driver.int()`, so they work with any user-supplied
  neo4j-driver instance.
- `rename_relationship` uses `elementId(old)` (Neo4j 5 element IDs) instead of
  the legacy `id()` function or `apoc` — no `apoc` dependency required.
- `recordLike` increments the engagement counter only when the LIKED relationship
  is first created (`ON CREATE SET p.likes = coalesce(p.likes, 0) + 1`), so repeat
  likes from the same user no longer double-count.
- `response-shaping.ts`: fixed a regex typo in `shortRe` — `\$` (backslash-dollar)
  became `$` so the end-of-string anchor matches correctly.
- `openaiRealtime()` WebRTC tool calls now go through `executeToolCalls` (schema
  validation, approval gating, guardrails, timeout) and send `function_call_output`
  back on the data channel.
- Output guardrails and the budget guardrail configured on `createClient` now
  apply inside `runAgent()` after streaming completes.

### Fixed
- `read_user_facts`: `relationType` validated against `/^[A-Z][A-Z0-9_]{0,63}$/`
  via `assertSafeRelation()` before interpolation into `-[r:${relationType}]->`;
  invalid values are rejected, no query is sent.
- `read_user_facts`: `RETURN` clause includes `elementId(r) AS relElementId`
  (Neo4j 5 element IDs are 3-part: `5:<uuid>:12`).
- `delete_user_fact`: validates element IDs with `ELEMENT_ID_RE` (accepts Neo4j 5
  3-part and legacy numeric IDs; rejects SQL injection and internal `_abc` IDs).
- `rename_relationship` now passes `newType` to the query and reports whether a
  relationship was actually renamed.
- `assertSafeRawCypher`: single-pass tokenizer correctly distinguishes `//` inside
  string literals from comment starts; comment content at EOF is implicitly
  terminated.
- `assertSafeRawCypher`: every MATCH / OPTIONAL MATCH pattern must start from an
  anchored `(u:User {id: $userId})` node or a variable bound to one — rejects
  cross-user reads via extra MATCH, comma-separated patterns, `OPTIONAL MATCH`
  from unanchored nodes, `labels()` bypasses, and `WITH` + unanchored MATCH.
- `merge_duplicate_nodes`: Cypher anchors on `(u:User {id: $userId})` and includes
  `NOT EXISTS { MATCH (other:User)-[*1..2]-(b) WHERE other.id <> $userId }` so
  only this user's duplicate nodes are touched.
- Handoff: other tool calls in the same turn as a handoff now receive error-flagged
  tool results (previously orphaned `tool_use` caused provider 400s).
- Streaming token usage: OpenAI-compatible providers request `include_usage: true`;
  Anthropic streaming now reports input tokens.
- Anthropic and Bedrock: empty text blocks are no longer sent on tool-call turns.
- `streamObject()`: an un-awaited `usage`/`object` promise no longer crashes the
  process on failure; awaiting callers still see the rejection.
- Sandbox: timeout now kills the whole process group, with ESRCH handled.
- `handleFunctionCall` in the realtime WebSocket path wraps `JSON.parse` in
  try/catch, so malformed argument JSON no longer crashes the session.
- PII guardrail: each text part in a multi-part message is redacted
  independently, so partial PII is caught without losing non-PII parts.
- `openaiRealtime().connect()` now rejects on failure instead of resolving a
  "failed" session state.
- CI no longer ignores test failures; `npm test` exits non-zero on any failure.
- `better-sqlite3`, `ioredis`, and `neo4j-driver` added to devDependencies.
- `docs/.next/` added to `.gitignore`.
- Windows: sandbox tests skip on Windows consistently; SQLite cleanup handles
  `EPERM`; symlink-unavailable test fall-backs gracefully.

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
