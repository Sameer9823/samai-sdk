// ⚠️ VERIFICATION NOTE (read before relying on this in production)
// This module talks to OpenAI's TTS, transcription, and Realtime APIs. `api.openai.com` is not
// reachable from the sandbox this file was written in, so — unlike the rest of this SDK's
// integrations, which were exercised against a real running server or process before being
// considered done — none of the three exports below have been run against a live OpenAI
// connection. The REST calls (`generateSpeech`, `transcribeAudio`) are low-risk: they're a
// straightforward `fetch()` following OpenAI's documented request/response shape, the same
// pattern as `createWebSearchTool()`'s Tavily/Brave calls, which *are* verified. The realtime
// WebSocket session (`createRealtimeSession`) is the riskier piece — it implements OpenAI's
// documented Realtime API event protocol (session.update, input_audio_buffer.*,
// conversation.item.*, response.*) as of this SDK's training data, but that API has moved fast
// and event names/fields may have shifted since. Test it against a live key before shipping it;
// if something doesn't match, the fix is almost certainly in `sendRaw`/the event `type` strings
// below, not in the surrounding connection/reconnection/tool-execution logic.
import type { ToolDefinition } from "./types.js";
import { toolParametersJsonSchema } from "./schema-adapter.js";

// ---------- Text-to-speech ----------

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | (string & {});
export type TTSFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

export interface GenerateSpeechOptions {
  /** Text to synthesize. */
  input: string;
  /** API key. Falls back to `OPENAI_API_KEY`. */
  apiKey?: string;
  /** TTS model. Default: "tts-1". */
  model?: string;
  /** Voice preset. Default: "alloy". */
  voice?: TTSVoice;
  /** Output audio format. Default: "mp3". */
  format?: TTSFormat;
  /** Playback speed, 0.25–4.0. Default: 1.0. */
  speed?: number;
  /** Base URL, for Azure OpenAI or a proxy. Default: "https://api.openai.com/v1". */
  baseURL?: string;
  timeoutMs?: number;
}

export interface GenerateSpeechResult {
  /** Raw audio bytes in the requested `format`. */
  audio: Buffer;
  contentType: string;
}

/**
 * Synthesizes speech from text via OpenAI's `/audio/speech` endpoint. Makes a real HTTP request
 * — not a stub — and requires an API key (`OPENAI_API_KEY` or `{ apiKey }`).
 *
 * Usage:
 *   const { audio } = await generateSpeech({ input: "Hello there!", voice: "nova" });
 *   await fs.writeFile("out.mp3", audio);
 */
export async function generateSpeech(options: GenerateSpeechOptions): Promise<GenerateSpeechResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("generateSpeech() has no API key. Pass { apiKey }, or set OPENAI_API_KEY in the environment.");
  }
  const baseURL = options.baseURL ?? "https://api.openai.com/v1";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const res = await fetch(`${baseURL}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: options.model ?? "tts-1",
        input: options.input,
        voice: options.voice ?? "alloy",
        response_format: options.format ?? "mp3",
        speed: options.speed,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`generateSpeech() failed: ${res.status} ${res.statusText} — ${await res.text().catch(() => "")}`);
    }
    const contentType = res.headers.get("content-type") ?? `audio/${options.format ?? "mpeg"}`;
    const arrayBuffer = await res.arrayBuffer();
    return { audio: Buffer.from(arrayBuffer), contentType };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Speech-to-text ----------

export interface TranscribeAudioOptions {
  /** Audio bytes to transcribe (any format the API accepts: mp3, wav, m4a, webm, etc). */
  audio: Buffer;
  /** Filename hint for the multipart upload — its extension tells the API the audio format. Default: "audio.wav". */
  filename?: string;
  /** API key. Falls back to `OPENAI_API_KEY`. */
  apiKey?: string;
  /** Transcription model. Default: "whisper-1". */
  model?: string;
  /** Optional ISO-639-1 language hint (e.g. "en") to improve accuracy/speed. */
  language?: string;
  /** Optional prompt to bias transcription (e.g. domain vocabulary, or the prior transcript for continuity). */
  prompt?: string;
  /** Base URL, for Azure OpenAI or a proxy. Default: "https://api.openai.com/v1". */
  baseURL?: string;
  timeoutMs?: number;
}

export interface TranscribeAudioResult {
  text: string;
}

/**
 * Transcribes audio to text via OpenAI's `/audio/transcriptions` endpoint (Whisper). Makes a
 * real HTTP request — not a stub — and requires an API key (`OPENAI_API_KEY` or `{ apiKey }`).
 *
 * Usage:
 *   const { text } = await transcribeAudio({ audio: await fs.readFile("recording.mp3"), filename: "recording.mp3" });
 */
export async function transcribeAudio(options: TranscribeAudioOptions): Promise<TranscribeAudioResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("transcribeAudio() has no API key. Pass { apiKey }, or set OPENAI_API_KEY in the environment.");
  }
  const baseURL = options.baseURL ?? "https://api.openai.com/v1";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

  try {
    const form = new FormData();
    form.append("model", options.model ?? "whisper-1");
    if (options.language) form.append("language", options.language);
    if (options.prompt) form.append("prompt", options.prompt);
    const filename = options.filename ?? "audio.wav";
    const blob = new Blob([options.audio], { type: guessAudioMimeType(filename) });
    form.append("file", blob, filename);

    const res = await fetch(`${baseURL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`transcribeAudio() failed: ${res.status} ${res.statusText} — ${await res.text().catch(() => "")}`);
    }
    const data = (await res.json()) as { text: string };
    return { text: data.text };
  } finally {
    clearTimeout(timer);
  }
}

function guessAudioMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    webm: "audio/webm",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

// ---------- Realtime voice sessions ----------

export interface RealtimeSessionOptions {
  /** API key. Falls back to `OPENAI_API_KEY`. */
  apiKey?: string;
  /** Realtime model. Default: "gpt-4o-realtime-preview" — check OpenAI's current docs, this name moves. */
  model?: string;
  /** Voice preset for the assistant's spoken responses. Default: "alloy". */
  voice?: TTSVoice;
  /** System instructions for the session. */
  instructions?: string;
  /**
   * Tools available to the model during the session. When a tool call comes in, it's executed
   * automatically (via each `ToolDefinition.execute()`) and the result is sent back to continue
   * the response — you don't need to handle `tool_call` events yourself unless you want to
   * observe them (they're still emitted, informationally, alongside the auto-execution).
   */
  tools?: ToolDefinition[];
  /**
   * Server-side voice activity detection config, or `null` to disable it (manual turn-taking —
   * you decide when to call `commitAudio()`). Default: server VAD with OpenAI's defaults.
   */
  turnDetection?: { threshold?: number; silenceDurationMs?: number; prefixPaddingMs?: number } | null;
  /** Input audio encoding sent via `sendAudio()`. Default: "pcm16" (24kHz, mono, little-endian). */
  inputAudioFormat?: "pcm16" | "g711_ulaw" | "g711_alaw";
  /** Output audio encoding received in `audio.delta` events. Default: "pcm16". */
  outputAudioFormat?: "pcm16" | "g711_ulaw" | "g711_alaw";
  /** Realtime endpoint override — e.g. an Azure OpenAI realtime deployment URL, or a relay/proxy. Default: OpenAI's `wss://api.openai.com/v1/realtime`. */
  url?: string;
  /** Extra headers for the WebSocket handshake (some environments need these instead of/alongside the Authorization header). */
  headers?: Record<string, string>;
}

export type RealtimeEvent =
  | { type: "session.ready" }
  | { type: "audio.delta"; audio: Buffer }
  | { type: "audio.done" }
  | { type: "transcript.delta"; delta: string; role: "assistant" | "user" }
  | { type: "transcript.done"; transcript: string; role: "assistant" | "user" }
  | { type: "text.delta"; delta: string }
  | { type: "text.done"; text: string }
  /** Server VAD detected the user starting to talk. A good moment to stop local audio playback. */
  | { type: "speech_started" }
  | { type: "speech_stopped" }
  | { type: "response.done" }
  | { type: "tool_call"; name: string; args: unknown; callId: string }
  | { type: "error"; error: unknown }
  /** Anything not mapped above, passed through unmodified so nothing is silently dropped as the API evolves. */
  | { type: "raw"; event: unknown };

export interface RealtimeSession {
  /** Opens the WebSocket connection and configures the session. Resolves once the server confirms the session is ready. */
  connect(): Promise<void>;
  /** Appends a chunk of input audio (raw bytes matching `inputAudioFormat`) to the input buffer. */
  sendAudio(chunk: Buffer): void;
  /** Manually signals end-of-turn. Unnecessary (and a no-op) when server VAD is enabled — the server commits automatically. */
  commitAudio(): void;
  /** Sends a text message as the user's turn and asks the model to respond. */
  sendText(text: string): void;
  /** Cancels the assistant's in-flight response — call this the instant you detect the user talking over it. */
  interrupt(): void;
  /** Subscribes to session events. Returns an unsubscribe function. */
  on(handler: (event: RealtimeEvent) => void): () => void;
  /** Sends a raw client event straight through, for anything this wrapper doesn't cover yet. See OpenAI's Realtime API event reference for the shape. */
  sendRaw(event: Record<string, unknown>): void;
  close(): Promise<void>;
}

interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: "open" | "message" | "close" | "error", listener: (event: any) => void): void;
}

interface WebSocketBinding {
  ctor: new (url: string, protocols?: string[], opts?: unknown) => WebSocketLike;
  /** Whether this implementation can send custom handshake headers (`ws` can; the standard, browser-spec-compliant global `WebSocket` cannot — browsers never allow it, and Node's built-in implementation follows the same spec). */
  supportsHeaders: boolean;
}

/**
 * Prefers the `ws` package when it's installed, since it's the only option here that can send
 * custom handshake headers (needed for `Authorization: Bearer ...`). Falls back to the global
 * `WebSocket` (stable in Node 22+, and the only option in browsers/edge runtimes) when `ws`
 * isn't available — in that case, `connect()` below authenticates via WebSocket subprotocols
 * instead of a header, which is the documented way to authenticate a Realtime API connection
 * from an environment that can't set custom headers (e.g. a browser).
 */
async function getWebSocketBinding(): Promise<WebSocketBinding> {
  try {
    const mod = await import("ws");
    const ctor = (mod.WebSocket ?? mod.default) as unknown as WebSocketBinding["ctor"];
    return { ctor, supportsHeaders: true };
  } catch {
    if (typeof WebSocket !== "undefined") {
      return { ctor: WebSocket as unknown as WebSocketBinding["ctor"], supportsHeaders: false };
    }
    throw new Error(
      "createRealtimeSession() needs a WebSocket implementation. Node 22+ has one built in " +
        "(no header support — auth falls back to subprotocols automatically); for header-based " +
        "auth on older Node, install the optional `ws` package (`npm install ws`)."
    );
  }
}

/**
 * Opens a realtime, bidirectional voice session against OpenAI's Realtime API — send audio or
 * text in, get streamed audio/text/transcript deltas back, with server-side voice-activity
 * detection and single-call interruption handling. This is the primitive behind voice agents:
 * pair it with a mic capture + speaker playback loop in your app (Node doesn't have those
 * built in — this handles the network/protocol side only).
 *
 * See the module-level comment at the top of this file for the current verification status —
 * this hasn't been run against a live OpenAI connection from the environment it was written in.
 *
 * Usage (text in, audio out):
 *   const session = createRealtimeSession({
 *     instructions: "You are a helpful, concise voice assistant.",
 *     voice: "alloy",
 *     tools: [getWeatherTool],
 *   });
 *   session.on((event) => {
 *     if (event.type === "audio.delta") playAudioChunk(event.audio); // your speaker output
 *     if (event.type === "transcript.delta") process.stdout.write(event.delta);
 *   });
 *   await session.connect();
 *   session.sendText("What's the weather in Tokyo?");
 *   // ...later:
 *   await session.close();
 *
 * Usage (mic audio in, with barge-in interruption):
 *   micStream.on("data", (chunk) => session.sendAudio(chunk));
 *   session.on((event) => {
 *     if (event.type === "speech_started") stopSpeakerPlayback(); // user is talking over the assistant
 *   });
 */
export function createRealtimeSession(options: RealtimeSessionOptions = {}): RealtimeSession {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model ?? "gpt-4o-realtime-preview";
  const url = options.url ?? `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

  const listeners = new Set<(event: RealtimeEvent) => void>();
  const toolsByName = new Map((options.tools ?? []).map((t) => [t.name, t]));

  let ws: WebSocketLike | null = null;

  function emit(event: RealtimeEvent): void {
    for (const listener of listeners) listener(event);
  }

  function send(event: Record<string, unknown>): void {
    if (!ws || ws.readyState !== 1 /* OPEN */) {
      throw new Error("RealtimeSession: not connected. Call connect() first and await it before sending.");
    }
    ws.send(JSON.stringify(event));
  }

  async function handleFunctionCall(name: string, callId: string, argsJson: string): Promise<void> {
    const tool = toolsByName.get(name);
    let output: string;
    if (!tool) {
      output = JSON.stringify({ error: `No tool named "${name}" is registered on this session.` });
    } else {
      try {
        const args = JSON.parse(argsJson || "{}");
        emit({ type: "tool_call", name, args, callId });
        const result = await tool.execute(args);
        output = typeof result === "string" ? result : JSON.stringify(result);
      } catch (err) {
        output = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      }
    }
    send({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output },
    });
    send({ type: "response.create" });
  }

  function handleServerEvent(raw: string, onReady?: () => void): void {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "session.created":
      case "session.updated":
        emit({ type: "session.ready" });
        onReady?.();
        break;
      case "response.audio.delta":
        emit({ type: "audio.delta", audio: Buffer.from(msg.delta as string, "base64") });
        break;
      case "response.audio.done":
        emit({ type: "audio.done" });
        break;
      case "response.audio_transcript.delta":
        emit({ type: "transcript.delta", delta: msg.delta as string, role: "assistant" });
        break;
      case "response.audio_transcript.done":
        emit({ type: "transcript.done", transcript: msg.transcript as string, role: "assistant" });
        break;
      case "conversation.item.input_audio_transcription.completed":
        emit({ type: "transcript.done", transcript: msg.transcript as string, role: "user" });
        break;
      case "response.text.delta":
        emit({ type: "text.delta", delta: msg.delta as string });
        break;
      case "response.text.done":
        emit({ type: "text.done", text: msg.text as string });
        break;
      case "input_audio_buffer.speech_started":
        emit({ type: "speech_started" });
        break;
      case "input_audio_buffer.speech_stopped":
        emit({ type: "speech_stopped" });
        break;
      case "response.done":
        emit({ type: "response.done" });
        break;
      case "response.function_call_arguments.done":
        void handleFunctionCall(msg.name as string, msg.call_id as string, msg.arguments as string);
        break;
      case "error":
        emit({ type: "error", error: msg.error ?? msg });
        break;
      default:
        emit({ type: "raw", event: msg });
    }
  }

  return {
    async connect() {
      if (!apiKey && !options.url) {
        throw new Error(
          "createRealtimeSession() has no API key. Pass { apiKey }, set OPENAI_API_KEY, or pass a " +
            "{ url } (e.g. a proxy) that doesn't need one."
        );
      }
      const WS = await getWebSocketBinding();
      const headers: Record<string, string> = {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "OpenAI-Beta": "realtime=v1",
        ...options.headers,
      };
      // Standard, browser-spec WebSocket can't send custom headers at all — OpenAI's documented
      // workaround for that case is authenticating via subprotocols instead. `ws` gets the
      // (more conventional) header-based auth, since it actually supports it.
      const protocols = WS.supportsHeaders
        ? undefined
        : ["realtime", ...(apiKey ? [`openai-insecure-api-key.${apiKey}`] : []), "openai-beta.realtime-v1"];

      await new Promise<void>((resolvePromise, reject) => {
        const socket = WS.supportsHeaders
          ? new WS.ctor(url, undefined, { headers })
          : new WS.ctor(url, protocols);
        ws = socket;
        let settled = false;

        socket.addEventListener("open", () => {
          send({
            type: "session.update",
            session: {
              instructions: options.instructions,
              voice: options.voice ?? "alloy",
              input_audio_format: options.inputAudioFormat ?? "pcm16",
              output_audio_format: options.outputAudioFormat ?? "pcm16",
              turn_detection:
                options.turnDetection === null
                  ? null
                  : {
                      type: "server_vad",
                      threshold: options.turnDetection?.threshold,
                      silence_duration_ms: options.turnDetection?.silenceDurationMs,
                      prefix_padding_ms: options.turnDetection?.prefixPaddingMs,
                    },
              tools: (options.tools ?? []).map((t) => ({
                type: "function",
                name: t.name,
                description: t.description,
                parameters: toolParametersJsonSchema(t),
              })),
            },
          });
          // Deliberately NOT resolving here — session.update having been *sent* doesn't mean the
          // server has *applied* it yet. connect() resolves from the message handler below, once
          // a session.created/session.updated event actually comes back.
        });
        socket.addEventListener("message", (event: { data: unknown }) => {
          handleServerEvent(typeof event.data === "string" ? event.data : String(event.data), () => {
            if (!settled) {
              settled = true;
              resolvePromise();
            }
          });
        });
        socket.addEventListener("error", (event: unknown) => {
          emit({ type: "error", error: event });
          if (!settled) {
            settled = true;
            reject(event instanceof Error ? event : new Error("RealtimeSession WebSocket error"));
          }
        });
        socket.addEventListener("close", () => {
          ws = null;
        });
      });
    },

    sendAudio(chunk: Buffer) {
      send({ type: "input_audio_buffer.append", audio: chunk.toString("base64") });
    },

    commitAudio() {
      send({ type: "input_audio_buffer.commit" });
    },

    sendText(text: string) {
      send({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
      });
      send({ type: "response.create" });
    },

    interrupt() {
      send({ type: "response.cancel" });
    },

    on(handler: (event: RealtimeEvent) => void) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },

    sendRaw(event: Record<string, unknown>) {
      send(event);
    },

    async close() {
      if (ws) ws.close();
      ws = null;
    },
  };
}
