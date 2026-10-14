# Changelog

All notable changes to samai-sdk are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) formatting and
[Semantic Versioning](https://semver.org/).

While the project is pre-1.0, minor version bumps (0.X.0) may include
breaking changes — these are called out explicitly below. Patch versions (0.3.X)
are bug-fix only EXCEPT 0.3.7, which contains security-driven breaking changes
listed under "Breaking changes".

## [Unreleased]

### Security
- Fixed a Cypher-injection vector in `read_user_facts`: the `relationType`
  parameter is now validated with `assertSafeRelation` (strict `^[A-Z]+$`
  regex) and passed as a bound `$relationType` parameter instead of being
  string-interpolated into the query. A relation type like
  `LIKES) DETACH DELETE n` was previously injected verbatim.
- `assertSafeRawCypher` (the opt-in raw-Cypher guard) now uses a single-pass
  tokenizer that correctly handles `//` inside string literals — the old
  two-pass regex approach stripped comments first, creating a bypass where
  `DELETE` hidden after a comment was missed.
- **Breaking changes**: per-user object nodes with `ownerId` anchoring,
  removal of `execute_cypher_query` from default tools, and the `toInteger($limit)`
  fix were all applied before any published version contained them. No published
  version of samai-sdk is affected.

## [0.3.7] - 2026-10-13

### Breaking changes
- `execute_cypher_query` is removed from the default graph-memory tool set.
  Set `enableGraphMemory({ unsafeRawCypher: true })` to opt back in — it runs
  READ-only sessions with single-pass comment/string stripping, mutation-keyword
  blocking, mandatory `:User {id: $userId}` anchoring, and a `toInteger($limit)`
  floor so plain-number params work with any neo4j-driver instance.
- `upsert_fact` now MERGEs object nodes (Topic, Post, etc.) with a per-user
  `ownerId` property. Existing cross-user shared nodes are **not** split on first
  upsert — run `migrateToPerUserNodes({ dryRun: true })` first to audit, then
  call it again without `dryRun` to clone shared nodes and re-point relationships
  per user.
- Deepgram and ElevenLabs STT/TTS providers now throw at `connect()` time when
  no API key is configured, instead of silently falling back to `process.env`
  at call time or returning a mock session. Use `apiKey: "mock"` for tests.
- `openaiRealtime().connect()` now rejects with a clear error when no API key,
  client secret, or `getEphemeralKey` is configured, instead of returning a
  mock session.
- `openaiRealtime()` WebRTC tool calls are now executed through
  `executeToolCalls` with approval gating (fail closed without a handler),
  restoring WebRTC tool-call support.

### Added
- `migrateToPerUserNodes({ dryRun?: boolean })` — scans for object nodes
  without `ownerId`, reports how many need migration, and (when `dryRun` is
  false) sets `ownerId` on single-owner nodes and clones multi-owner nodes
  per user. Run with `{ dryRun: true }` before the real pass.
- `assertSafeRawCypher()` — exported from `samai-sdk`; guards raw Cypher with
  read-only sessions, single-pass comment/string neutralising, mutation keyword
  blocking, and mandatory `:User` anchoring. Every MATCH pattern must start
  from an anchored `(u:User {id: $userId})` node or a variable bound to one.
- WebRTC data-channel `function_call` edge-case tests: dedup duplicate events,
  handle malformed args JSON without throwing, reject unknown tool names, fail
  closed on approval-gated tools without a handler, and receive args from
  `response.output_item.done` without a prior `arguments.done`.

### Changed
- **Per-user object nodes**: `upsert_fact` and all other graph-memory tools
  now MERGE object nodes with `ownerId: $userId`, so two users with the same
  fact name get distinct nodes (no cross-user leakage in the graph).
- **Fixed tool set**: graph-memory tools (`upsert_fact`, `read_user_facts`,
  `delete_user_fact`) are fully parameterized and always anchored on the `:User`
  node — the model passes values, never query text.
- `read_user_facts` and the feed query now use `LIMIT toInteger($limit)` instead
  of relying on `driver.int()`, so they work with any user-supplied
  neo4j-driver instance.
- `rename_relationship` uses `elementId(old)` (Neo4j 5 element IDs) instead of
  the legacy `id()` function or `apoc` — no `apoc` dependency required.
- `recordLike`: `ON CREATE SET p.likes = coalesce(p.likes, 0) + 1` correctly
  initialises the engagement counter for first-time likers.
- `response-shaping.ts`: fixed a regex typo in `shortRe` (`$/` → `$`) so the
  end-of-string anchor works correctly.

### Fixed
- `read_user_facts`: `relationType` is validated with `assertSafeRelation`
  (regex `^[A-Z]+$`) and bound as a parameter — prevents Cypher injection.
- `read_user_facts`: `RETURN` clause includes `elementId(r) AS relElementId`
  for Neo4j 5 compatibility (4-part element IDs).
- `delete_user_fact`: validates element IDs with `ELEMENT_ID_RE` (accepts
  Neo4j 5 `4-part` and legacy numeric IDs; rejects SQL injection and internal
  `_abc` IDs).
- `assertSafeRawCypher`: single-pass tokenizer correctly distinguishes `//`
  inside string literals from comment starts; comment content at EOF is
  implicitly terminated.
- `assertSafeRawCypher`: every MATCH / OPTIONAL MATCH pattern must start from
  an anchored `(u:User {id: $userId})` node or a variable bound to one —
  rejects cross-user reads via extra MATCH, comma-separated patterns,
  `OPTIONAL MATCH` from unanchored nodes, and `labels()` bypasses.
- `merge_duplicate_nodes`: Cypher anchors on `(u:User {id: $userId})` and
  includes `NOT EXISTS { MATCH (other:User)-[*1..2]-(b) WHERE other.id <> $userId }`
  so only this user's duplicate nodes are touched.
- Pipeline voice tool loop: the second model call receives
  `[user, assistant[text, tool-call], tool[tool-result]]` in that order.
- Pipeline voice approval gating: `executeToolCalls` fails closed when a tool
  has `requiresApproval: true` and no `onApprovalRequest` handler is provided.
- WebRTC `function_call_output` sent back on the data channel with the tool
  result, followed by `response.create` to continue the conversation.
- `openaiRealtime()` no longer leaks a long-lived API key to the browser:
  WebRTC uses ephemeral client secrets via `createRealtimeClientSecret()`,
  and `connect()` rejects when credentials are missing.
- `userId` override: `enableGraphMemory({ userId })` correctly uses the
  provided value instead of falling through to a default.
- PII per-part redaction: each message part is evaluated independently, so
  partial PII in a multi-part message is redacted without losing the
  non-PII parts.
- `.gitattributes`: `export-subst` configured for reproducible version
  stamping.

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
