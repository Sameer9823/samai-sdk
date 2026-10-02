/**
 * Offline test for the GA Realtime surfaces: ephemeral client secrets, the WebRTC transport, and
 * the WebRTC path through `openaiRealtime()`.
 *
 * Everything here runs against fake browser globals (`RTCPeerConnection`, `MediaStream`,
 * `RTCSessionDescription`) and an injected `fetch`, so no network, no microphone, and no OpenAI key
 * are involved. What it verifies is the part that is easy to get wrong and hard to notice:
 *
 *   - the client-secret call hits the GA `POST /v1/realtime/client_secrets` endpoint with the GA
 *     `session: { type: "realtime" }` body;
 *   - the SDP offer is POSTed to `/v1/realtime/calls` as `application/sdp`, the answer is applied,
 *     and the remote stream comes back;
 *   - the session update sent over the data channel uses GA shapes and exactly one output modality;
 *   - data-channel events map onto the SDK's agent events (assistant captions from
 *     `response.output_audio_transcript.delta`, user captions from the input-transcription events,
 *     barge-in, connection lifecycle).
 *
 * What it can NOT verify: that OpenAI's live endpoint accepts these payloads. That still needs a real
 * key. See the disclaimer at the top of src/voice.ts.
 *
 * Run with: npx tsx examples/voice-realtime-ga-test.ts
 */
import { z } from "zod";
import { openaiRealtime } from "../src/voice/realtime/openai-realtime.js";
import { createRealtimeClientSecret, OpenAIRealtimeWebRTCTransport } from "../src/voice/transport/openai-webrtc.js";
import { defineVoiceAgent } from "../src/voice/voice-agent.js";
import { defineTool } from "../src/types.js";
import { createSession, InMemorySessionStore } from "../src/session.js";
import * as voiceEntry from "../src/voice/index.js";

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  ✅ ${label}`);
  else {
    console.log(`  ❌ ${label}`);
    failures++;
  }
}

// ── fake browser globals ──────────────────────────────────────────────────────────────────────

interface Listener {
  (event: any): void;
}

class FakeDataChannel {
  readyState = "connecting";
  sent: string[] = [];
  label = "";
  private listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, fn: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type: string, event: any) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(event);
  }
  send(data: string) {
    if (this.readyState !== "open") throw new Error("data channel not open");
    this.sent.push(data);
  }
  close() {
    this.readyState = "closed";
  }
  open() {
    this.readyState = "open";
    this.dispatch("open", {});
  }
  /** Delivers a realtime protocol event, as the API would over the wire. */
  emitProtocol(message: Record<string, unknown>) {
    this.dispatch("message", { data: JSON.stringify(message) });
  }
}

class FakeMediaStreamTrack {
  constructor(readonly kind = "audio") {}
  stop() {}
}

class FakeMediaStream {
  constructor(private tracks: FakeMediaStreamTrack[] = [new FakeMediaStreamTrack()]) {}
  getTracks() {
    return this.tracks;
  }
}

class FakeRTCPeerConnection {
  iceGatheringState: "complete" | "gathering" = "complete";
  iceConnectionState: "new" | "checking" | "connected" = "new";
  connectionState = "new";
  localDescription: any = null;
  remoteDescription: any = null;
  ontrack: ((event: any) => void) | null = null;
  onicecandidate: ((event: any) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  addedTracks: unknown[][] = [];
  channels: FakeDataChannel[] = [];
  private listeners = new Map<string, Set<Listener>>();
  /** Latest instance, so a test can drive the data channel after negotiation. */
  static last: FakeRTCPeerConnection | null = null;

  constructor(public config: { iceServers?: unknown }) {
    FakeRTCPeerConnection.last = this;
  }
  addEventListener(type: string, fn: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }
  createDataChannel(label: string) {
    const channel = new FakeDataChannel();
    channel.label = label;
    this.channels.push(channel);
    return channel;
  }
  addTrack(track: unknown, ...streams: unknown[]) {
    this.addedTracks.push([track, ...streams]);
  }
  async createOffer() {
    return { type: "offer", sdp: "v=0\r\no=- FAKE OFFER\r\n" };
  }
  async setLocalDescription(description: any) {
    this.localDescription = { type: "offer", sdp: "v=0\r\no=- FAKE OFFER\r\n", ...description };
  }
  async setRemoteDescription(description: any) {
    this.remoteDescription = description;
    // The API starts sending audio as soon as the answer is applied.
    this.ontrack?.({ streams: [new FakeMediaStream()], track: new FakeMediaStreamTrack() });
    // ...and the event channel opens alongside the media path.
    for (const channel of this.channels) channel.open();
  }
  get channel() {
    return this.channels[0];
  }
}

const globals = globalThis as any;
const originalGlobals = {
  RTCPeerConnection: globals.RTCPeerConnection,
  RTCSessionDescription: globals.RTCSessionDescription,
  MediaStream: globals.MediaStream,
};

function installBrowserGlobals() {
  globals.RTCPeerConnection = FakeRTCPeerConnection;
  globals.RTCSessionDescription = class {
    type: string;
    sdp: string;
    constructor(init: any) {
      this.type = init?.type;
      this.sdp = init?.sdp;
    }
  };
  globals.MediaStream = FakeMediaStream;
}

function restoreBrowserGlobals() {
  globals.RTCPeerConnection = originalGlobals.RTCPeerConnection;
  globals.RTCSessionDescription = originalGlobals.RTCSessionDescription;
  globals.MediaStream = originalGlobals.MediaStream;
}

/** A `fetch` stand-in that records the request and replays a canned SDP answer. */
function fakeSdpFetch(answer = "v=0\r\no=- FAKE ANSWER\r\n") {
  const calls: Array<{ url: string; init: any }> = [];
  const impl = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === "location" ? "https://api.openai.com/v1/realtime/calls/call_abc123" : null) },
      text: async () => answer,
      json: async () => ({}),
    };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

// ── tests ─────────────────────────────────────────────────────────────────────────────────────

async function testClientSecretMinting() {
  console.log("=== TEST: createRealtimeClientSecret() mints a GA ephemeral client secret ===");
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "",
      json: async () => ({ value: "ek_test_secret", expires_at: 1893456000 }),
    };
  }) as unknown as typeof fetch;

  const secret = await createRealtimeClientSecret({
    apiKey: "sk-server-only",
    model: "gpt-realtime",
    ttlSeconds: 600,
    safetyIdentifier: "user-42",
    fetchImpl,
  });

  check("posts to the GA client_secrets endpoint", calls[0]?.url === "https://api.openai.com/v1/realtime/client_secrets");
  check("uses POST", calls[0]?.init?.method === "POST");
  check("authenticates with the long-lived server key", calls[0]?.init?.headers?.Authorization === "Bearer sk-server-only");
  check("forwards the safety identifier", calls[0]?.init?.headers?.["OpenAI-Safety-Identifier"] === "user-42");

  const body = JSON.parse(calls[0].init.body);
  check("body declares the GA realtime session type", body.session?.type === "realtime");
  check("body carries the requested model", body.session?.model === "gpt-realtime");
  check("body carries the requested TTL", body.expires_after?.seconds === 600 && body.expires_after?.anchor === "created_at");
  check("body never contains the API key", !JSON.stringify(body).includes("sk-server-only"));
  check("returns the ek_ value and expiry", secret.value === "ek_test_secret" && secret.expiresAt === 1893456000);

  // A missing `value` is a protocol error worth surfacing loudly rather than handing back `undefined`.
  const emptyFetch = (async () => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => "", json: async () => ({}) })) as unknown as typeof fetch;
  let threw = false;
  try {
    await createRealtimeClientSecret({ apiKey: "sk", fetchImpl: emptyFetch });
  } catch {
    threw = true;
  }
  check("throws when the response has no value", threw);

  const errorFetch = (async () => ({ ok: false, status: 401, headers: { get: () => null }, text: async () => "bad key" })) as unknown as typeof fetch;
  let authError = "";
  try {
    await createRealtimeClientSecret({ apiKey: "sk", fetchImpl: errorFetch });
  } catch (err) {
    authError = err instanceof Error ? err.message : String(err);
  }
  check("surfaces the HTTP status on failure", authError.includes("401"));
}

async function testWebRtcTransportNegotiation() {
  console.log("=== TEST: OpenAIRealtimeWebRTCTransport completes the SDP handshake ===");
  installBrowserGlobals();
  try {
    const { impl, calls } = fakeSdpFetch();
    const inputStream = new FakeMediaStream() as any;
    const transport = new OpenAIRealtimeWebRTCTransport({
      clientSecret: "ek_abc",
      inputStream,
      fetchImpl: impl,
    });

    const call = await transport.negotiate();

    const pc = FakeRTCPeerConnection.last!;
    check("opens the oai-events data channel", pc.channel?.label === "oai-events");
    check("adds the caller's microphone track", pc.addedTracks.length === 1 && pc.addedTracks[0][1] === inputStream);
    check("sets the local offer before POSTing", !!pc.localDescription?.sdp);
    check("POSTs the SDP offer to /v1/realtime/calls", calls[0]?.url === "https://api.openai.com/v1/realtime/calls");
    check("sends application/sdp", calls[0]?.init?.headers?.["Content-Type"] === "application/sdp");
    check("authenticates with the ephemeral secret, not a long-lived key", calls[0]?.init?.headers?.Authorization === "Bearer ek_abc");
    check("sends the raw SDP body", typeof calls[0]?.init?.body === "string" && calls[0].init.body.includes("FAKE OFFER"));
    check("applies the SDP answer as a remote description", (pc.remoteDescription as any)?.type === "answer");
    check("reads the call id from the Location header", call.callId === "call_abc123");
    check("exposes the remote audio stream for playback", !!call.remoteStream);
    check("getRemoteStream() returns the same stream", transport.getRemoteStream() === call.remoteStream);
    check("isNegotiated() reports the completed handshake", transport.isNegotiated());
    check("negotiate() is idempotent", (await transport.negotiate()).dataChannel === call.dataChannel);

    // Events arriving on the data channel are re-emitted as parsed JSON.
    const received: any[] = [];
    transport.on("event", (e: any) => received.push(e));
    (call.dataChannel as any).emitProtocol({ type: "session.created" });
    check("data-channel events are surfaced as parsed JSON", received[0]?.type === "session.created");

    // Malformed frames are dropped rather than thrown through the transport.
    (call.dataChannel as unknown as FakeDataChannel).dispatch("message", { data: "not json" });
    check("a malformed data-channel frame is ignored, not thrown", received.length === 1);

    transport.close();
    check("close() tears the channel down", transport.getDataChannel() === null && !transport.isNegotiated());
  } finally {
    restoreBrowserGlobals();
  }
}

async function testWebRtcTransportErrors() {
  console.log("=== TEST: OpenAIRealtimeWebRTCTransport fails loudly ===");

  // No WebRTC at all (server-side, or a browser without it).
  const savedPc = globals.RTCPeerConnection;
  delete globals.RTCPeerConnection;
  let noWebrtc = "";
  try {
    await new OpenAIRealtimeWebRTCTransport({ clientSecret: "ek", inputStream: {} as any }).negotiate();
  } catch (err) {
    noWebrtc = err instanceof Error ? err.message : String(err);
  }
  check("negotiate() reports when WebRTC is unavailable", noWebrtc.includes("WebRTC is not available"));
  globals.RTCPeerConnection = savedPc;

  // Handshake rejected by the API.
  installBrowserGlobals();
  try {
    const rejectingFetch = (async () => ({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => "invalid client secret",
    })) as unknown as typeof fetch;
    let message = "";
    try {
      await new OpenAIRealtimeWebRTCTransport({ clientSecret: "ek_bad", inputStream: new FakeMediaStream() as any, fetchImpl: rejectingFetch }).negotiate();
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    check("a rejected SDP POST surfaces the status and body", message.includes("401") && message.includes("invalid client secret"));
  } finally {
    restoreBrowserGlobals();
  }

  // No credential: fail before the POST rather than sending an unauthenticated offer.
  installBrowserGlobals();
  let noCredential = "";
  try {
    await new OpenAIRealtimeWebRTCTransport({ inputStream: new FakeMediaStream() as any, fetchImpl: fakeSdpFetch().impl }).negotiate();
  } catch (err) {
    noCredential = err instanceof Error ? err.message : String(err);
  } finally {
    restoreBrowserGlobals();
  }
  check("negotiate() refuses to send an offer without a credential", noCredential.includes("no credential"));
}

async function testOpenAIRealtimeOverWebRtc() {
  console.log("=== TEST: openaiRealtime({ transport: 'webrtc' }) end to end ===");
  installBrowserGlobals();
  try {
    const { impl, calls } = fakeSdpFetch();
    const agent = defineVoiceAgent({
      name: "browser-agent",
      instructions: "You are a browser voice agent.",
      model: "gpt-realtime",
      tools: [
        defineTool({
          name: "get_time",
          description: "Gets the current time",
          parameters: z.object({}),
          execute: async () => "12:00 PM",
        }),
      ],
    });

    const provider = openaiRealtime({
      clientSecret: "ek_browser",
      transport: "webrtc",
      inputStream: new FakeMediaStream() as any,
      callHeaders: { "OpenAI-Safety-Identifier": "user-42" },
      fetchImpl: impl,
    });

    const events: any[] = [];
    const vs: any = await provider.connect({ agent, session: createSession("webrtc-1", new InMemorySessionStore()) });
    for (const type of [
      "connection-state",
      "assistant-transcript-delta",
      "assistant-transcript-done",
      "user-transcript-delta",
      "user-speech-ended",
      "agent-audio-chunk",
      "agent-speech-started",
      "interruption",
      "response-cancelled",
      "run-failed",
    ] as const) {
      vs.on(type, (e: any) => events.push(e));
    }

    check("the SDP offer carried the caller's extra headers", calls[0]?.init?.headers?.["OpenAI-Safety-Identifier"] === "user-42");
    check("the session is exposed as connected", vs.getConnectionState() === "connected");
    check("the remote audio stream is available for an <audio> element", !!vs.getRemoteStream());

    const channel = (FakeRTCPeerConnection.last as any).channel as FakeDataChannel;
    check("the data channel is open", channel.readyState === "open");

    const sessionUpdate = channel.sent.map((s) => JSON.parse(s)).find((m) => m.type === "session.update");
    check("the client sends a session.update over the data channel", !!sessionUpdate);
    check("it uses the GA session type", sessionUpdate?.session?.type === "realtime");
    check(
      "it requests exactly one output modality (GA rejects both)",
      Array.isArray(sessionUpdate?.session?.output_modalities) &&
        sessionUpdate.session.output_modalities.length === 1 &&
        sessionUpdate.session.output_modalities[0] === "audio"
    );
    check("it nests the voice under audio.output", sessionUpdate?.session?.audio?.output?.voice === "alloy");
    check("it enables input transcription so user captions arrive", !!sessionUpdate?.session?.audio?.input?.transcription?.model);
    check("it enables turn detection with barge-in by default", sessionUpdate?.session?.audio?.input?.turn_detection?.interrupt_response === true);
    check("it registers the agent's tools with a JSON Schema", sessionUpdate?.session?.tools?.[0]?.name === "get_time" && typeof sessionUpdate.session.tools[0].parameters === "object");
    check("it carries the agent instructions", sessionUpdate?.session?.instructions === "You are a browser voice agent.");

    // ── protocol events from the data channel ──
    channel.emitProtocol({ type: "input_audio_buffer.speech_started" });
    channel.emitProtocol({ type: "conversation.item.input_audio_transcription.delta", delta: "what is" });
    channel.emitProtocol({ type: "conversation.item.input_audio_transcription.completed", transcript: "What is the time?" });
    check("user captions come from the input-transcription events", events.some((e) => e.type === "user-transcript-delta" && e.delta === "what is"));
    check("the final user transcript closes the turn", events.some((e) => e.type === "user-speech-ended" && e.transcript === "What is the time?"));

    channel.emitProtocol({ type: "response.output_audio.delta", delta: Buffer.from("pcm").toString("base64") });
    channel.emitProtocol({ type: "response.output_audio_transcript.delta", delta: "It is" });
    channel.emitProtocol({ type: "response.output_audio_transcript.done", transcript: "It is 12:00 PM." });
    check("assistant captions come from response.output_audio_transcript.*", events.some((e) => e.type === "assistant-transcript-delta" && e.delta === "It is"));
    check("the final assistant transcript is emitted", events.some((e) => e.type === "assistant-transcript-done" && e.transcript === "It is 12:00 PM."));
    check("assistant audio reaches the agent as an ArrayBuffer", events.some((e) => e.type === "agent-audio-chunk" && e.chunk instanceof ArrayBuffer));
    check("the agent is marked as speaking", events.some((e) => e.type === "agent-speech-started"));

    // ── barge-in while the assistant is still speaking ──
    channel.emitProtocol({ type: "input_audio_buffer.speech_started" });
    check("barge-in emits an interruption", events.some((e) => e.type === "interruption"));

    channel.emitProtocol({ type: "response.done" });
    vs.interrupt();
    check("interrupt() cancels the in-flight response", channel.sent.map((s) => JSON.parse(s)).some((m) => m.type === "response.cancel"));
    check("interrupt() emits an explicit interruption", events.some((e) => e.type === "interruption" && e.reason === "explicit"));

    channel.emitProtocol({ type: "error", error: { message: "boom" } });
    check("a protocol error becomes a run-failed event", events.some((e) => e.type === "run-failed"));

    // Text turns work over WebRTC too.
    vs.sendText("hello there");
    const sentTypes = channel.sent.map((s) => JSON.parse(s)).map((m) => m.type);
    check("sendText() creates a user item and asks for a response", sentTypes.includes("conversation.item.create") && sentTypes.includes("response.create"));

    await vs.close();
    check("close() tears the transport down", vs.getRemoteStream() === null);
  } finally {
    restoreBrowserGlobals();
  }
}

async function testWebRtcMisconfiguration() {
  console.log("=== TEST: openaiRealtime() guards its WebRTC configuration ===");

  installBrowserGlobals();
  try {
    const agent = defineVoiceAgent({ name: "a", instructions: "i", model: "gpt-realtime" });
    let noStream = "";
    try {
      await openaiRealtime({ transport: "webrtc", clientSecret: "ek" }).connect({
        agent,
        session: createSession("cfg-1", new InMemorySessionStore()),
      });
    } catch (err) {
      noStream = err instanceof Error ? err.message : String(err);
    }
    check("transport: 'webrtc' without an inputStream is rejected", noStream.includes("requires an inputStream"));

    let noSecret = "";
    // A server-side key in the environment is enough to get past the "no credential at all" check,
    // which is exactly the state where the WebRTC branch must insist on a *client secret* — that is
    // what stops a long-lived key from being sent to /realtime/calls from a browser.
    const savedKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-should-not-be-used-here";
    try {
      await openaiRealtime({ transport: "webrtc", inputStream: new FakeMediaStream() as any }).connect({
        agent,
        session: createSession("cfg-2", new InMemorySessionStore()),
      });
    } catch (err) {
      noSecret = err instanceof Error ? err.message : String(err);
    } finally {
      if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = savedKey;
    }
    check("transport: 'webrtc' without a client secret is rejected", noSecret.includes("requires a clientSecret"));
  } finally {
    restoreBrowserGlobals();
  }

  // No WebRTC support at all: fail with an actionable message instead of a TypeError.
  const savedPc = globals.RTCPeerConnection;
  delete globals.RTCPeerConnection;
  try {
    const agent = defineVoiceAgent({ name: "a", instructions: "i", model: "gpt-realtime" });
    let noWebrtc = "";
    try {
      await openaiRealtime({ transport: "webrtc", clientSecret: "ek", inputStream: new FakeMediaStream() as any }).connect({
        agent,
        session: createSession("cfg-3", new InMemorySessionStore()),
      });
    } catch (err) {
      noWebrtc = err instanceof Error ? err.message : String(err);
    }
    check("a runtime without RTCPeerConnection gets a clear error", noWebrtc.includes("does not support WebRTC"));
  } finally {
    globals.RTCPeerConnection = savedPc;
  }
}

function testVoiceEntryExports() {
  console.log("=== TEST: samai-sdk/voice exports everything a browser app needs ===");
  const expected: Array<[string, keyof typeof voiceEntry]> = [
    ["createRealtimeClientSecret", "createRealtimeClientSecret"],
    ["defineTool", "defineTool"],
    ["defineVoiceAgent", "defineVoiceAgent"],
    ["runVoiceAgent", "runVoiceAgent"],
    ["openaiRealtime", "openaiRealtime"],
    ["createRealtimeSession", "createRealtimeSession"],
    ["WebRTCVoiceTransport", "WebRTCVoiceTransport"],
    ["OpenAIRealtimeWebRTCTransport", "OpenAIRealtimeWebRTCTransport"],
    ["stopMediaStream", "stopMediaStream"],
    ["createOffer", "createOffer"],
    ["handleAnswer", "handleAnswer"],
    ["handleOffer", "handleOffer"],
    ["addIceCandidate", "addIceCandidate"],
    ["ConversationEngine", "ConversationEngine"],
    ["VoiceActivityDetector", "VoiceActivityDetector"],
    ["InterruptionController", "InterruptionController"],
    ["createMockSTTProvider", "createMockSTTProvider"],
    ["createMockTTSProvider", "createMockTTSProvider"],
    ["createMockVoiceTransport", "createMockVoiceTransport"],
  ];
  for (const [name, key] of expected) {
    check(`${name} is exported from samai-sdk/voice`, typeof voiceEntry[key] === "function");
  }
}

async function main() {
  await testClientSecretMinting();
  await testWebRtcTransportNegotiation();
  await testWebRtcTransportErrors();
  await testOpenAIRealtimeOverWebRtc();
  await testWebRtcMisconfiguration();
  testVoiceEntryExports();

  console.log(failures === 0 ? "\n✅ All GA realtime + WebRTC tests passed" : `\n❌ ${failures} test(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Uncaught error:", err);
  process.exit(1);
});
