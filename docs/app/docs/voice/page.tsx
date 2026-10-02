import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const PIPELINE_CODE = `import { pipelineVoice } from "samai-sdk/voice";
import { deepgramSTT } from "samai-sdk/voice";
import { elevenLabsTTS } from "samai-sdk/voice";
import { defineVoiceAgent } from "samai-sdk/voice";
import { anthropic } from "samai-sdk";

// Any text Provider works as the LLM — swap anthropic() for openai() etc.
const voiceProvider = pipelineVoice({
  stt: deepgramSTT({ apiKey: process.env.DEEPGRAM_KEY }),
  llm: anthropic({ apiKey: process.env.ANTHROPIC_KEY }),
  tts: elevenLabsTTS({ apiKey: process.env.ELEVEN_KEY }),
});

const agent = defineVoiceAgent({
  name: "concierge",
  instructions: "You are a helpful, concise voice assistant.",
  model: "claude-sonnet-4-5",
  voice: { interruption: "confidence-gated", backchannel: true },
});

const session = await voiceProvider.connect({ agent, session });
session.on("user-speech-ended", (e) => console.log("user:", e.transcript));
session.on("interruption", () => console.log("barge-in — TTS cancelled"));
session.sendAudio(micChunk); // ArrayBuffer from your mic
session.interrupt();         // explicit barge-in
await session.close();`;

const REACT_CODE = `import { useVoiceAgent } from "samai-sdk/react-voice";
import { pipelineVoice } from "samai-sdk/voice";

function VoiceButton({ provider, agent }) {
  const { isConnected, isSpeaking, transcript, connect, disconnect, sendAudio, interrupt } =
    useVoiceAgent(provider, agent);
  return (
    <button onClick={isConnected ? disconnect : connect}>
      {isSpeaking ? "Speaking…" : isConnected ? "Listening" : "Connect"}
    </button>
  );
}`;

const ENGINE_CODE = `import { ConversationEngine } from "samai-sdk/voice";

const engine = new ConversationEngine({ agent, session, trace });
// engine.handleUserSpeechEnded(transcript, confidence) -> clarification or null
// engine.handleBargeIn({ confidence, durationMs })     -> true if barge-in accepted
// engine.getState() // "idle" | "connecting" | "listening" | "user_speaking" | "thinking"
//                   // | "speaking" | "assistant_speaking" | "interrupting" | "interrupted"
//                   // | "reconnecting" | "error"`;

const TTS_CODE = `import { generateSpeech, transcribeAudio } from "samai-sdk";
import { writeFile, readFile } from "node:fs/promises";

const { audio } = await generateSpeech({ input: "Hello there!", voice: "nova" });
await writeFile("out.mp3", audio);

const { text } = await transcribeAudio({ audio: await readFile("recording.mp3"), filename: "recording.mp3" });`;

const REALTIME_CODE = `import { createRealtimeSession } from "samai-sdk";

// Server-side, or any host with a WebSocket-capable runtime.
const session = createRealtimeSession({
  instructions: "You are a helpful, concise voice assistant.",
  voice: "alloy",
  tools: [getWeatherTool],
});

session.on((event) => {
  if (event.type === "audio.delta") playAudioChunk(event.audio);
  if (event.type === "speech_started") session.truncateLastResponse(playedMs);
});

await session.connect();
session.sendText("What's the weather in Tokyo?");
session.interrupt();
await session.close();`;

const BROWSER_ROUTE_CODE = `// app/api/realtime-secret/route.ts — SERVER ONLY.
// This is the one place the long-lived API key is allowed to appear.
import { NextResponse } from "next/server";
import { createRealtimeClientSecret } from "samai-sdk/voice";

export async function POST() {
  const { value, expiresAt } = await createRealtimeClientSecret({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-realtime",
    ttlSeconds: 600,             // 10–7200; the browser holds it for this long
    safetyIdentifier: "user-1234", // OpenAI's abuse-tracking header
  });
  return NextResponse.json({ clientSecret: value, expiresAt });
}`;

const BROWSER_CLIENT_CODE = `"use client";
// components/VoiceAgent.tsx
import { useState } from "react";
import { openaiRealtime, stopMediaStream, type VoiceAgentEvent } from "samai-sdk/voice";

export function VoiceAgent() {
  const [status, setStatus] = useState("idle");
  const [caption, setCaption] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    // 1. Mint the ephemeral secret on the server. Never ship OPENAI_API_KEY here.
    const { clientSecret } = await fetch("/api/realtime-secret", { method: "POST" })
      .then((r) => r.json());

    // 2. Ask for the mic ourselves, so permission errors stay ours to surface.
    const inputStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = inputStream;

    // 3. Connect over WebRTC. transport: "webrtc" is implied by inputStream.
    const provider = openaiRealtime({ clientSecret, inputStream });
    const session = await provider.connect({ agent, session });
    sessionRef.current = session;

    // 4. The assistant's voice arrives as a MediaStream — no PCM plumbing needed.
    if (audioRef.current && session.getRemoteStream()) {
      audioRef.current.srcObject = session.getRemoteStream();
      await audioRef.current.play();
    }

    session.on("assistant-transcript-delta", (e: any) => setCaption((c) => c + e.delta));
    session.on("user-transcript-delta", (e: any) => setCaption((c) => c + e.delta));
    session.on("connection-state", (e: any) => setStatus(e.state));
  }

  async function stop() {
    await sessionRef.current?.close();
    stopMediaStream(streamRef.current); // release the microphone
    sessionRef.current = null;
    streamRef.current = null;
    setStatus("idle");
  }

  return (
    <div>
      <button onClick={status === "idle" ? start : stop}>{status === "idle" ? "Talk" : status}</button>
      <p>{caption}</p>
      <audio ref={audioRef} autoPlay />
    </div>
  );
}`;

const BROWSER_AGENT_CODE = `// lib/agent.ts — shared by the route and the client. Safe to import in a
// client component: samai-sdk/voice pulls in no Node built-ins.
import { defineTool, defineVoiceAgent } from "samai-sdk/voice";
import { z } from "zod";

export const getTimeTool = defineTool({
  name: "get_time",
  description: "Gets the current time in the user's timezone",
  parameters: z.object({ timezone: z.string().optional() }),
  execute: async ({ timezone }) => new Date().toLocaleTimeString("en-US", { timeZone: timezone }),
});

export const agent = defineVoiceAgent({
  name: "assistant",
  instructions: "You are a helpful, concise voice assistant.",
  model: "gpt-realtime",
  tools: [getTimeTool],
});`;

export default function VoicePage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Voice agents — pipeline, engine, and realtime"
        description="A provider-agnostic pipeline (STT → LLM → TTS), a deterministic conversation engine, and OpenAI Realtime over WebRTC or WebSocket — all with mock-based testing and tracing."
      >
        <Callout tone="guard" title="Realtime is GA, not preview">
          The Realtime <em>preview</em> API is retired. <code>samai-sdk</code> 0.3.6+ targets the GA
          interface: default model <code>gpt-realtime</code>, <code>session.type: &quot;realtime&quot;</code>,
          audio config nested under <code>session.audio.input/output</code>, ephemeral client secrets,
          and <strong>no <code>OpenAI-Beta</code> header</strong>. If you were on{" "}
          <code>gpt-4o-realtime-preview</code>, move the model and drop any preview-only parameters.
          See the CHANGELOG&apos;s breaking changes.
        </Callout>

        <Callout tone="guard" title="Heads up">
          <code>generateSpeech()</code>/<code>transcribeAudio()</code> are straightforward REST calls (same shape as{" "}
          <code>createWebSearchTool()</code>) but haven&apos;t been exercised against a live key from this SDK&apos;s dev
          environment. <code>createRealtimeSession()</code>&apos;s wire-protocol logic <em>has</em> been verified
          against a real local mock WebSocket server — catching and fixing a real race condition and an auth bug in the
          process — but the exact event names/fields haven&apos;t been confirmed against OpenAI&apos;s live server, since
          that API moves quickly. Read the disclaimer at the top of <code>src/voice.ts</code> before production use.
        </Callout>

        <h2 id="browser">Browser quick start (WebRTC)</h2>
        <p>
          A browser voice app needs three things and nothing else from this SDK: a server route that
          mints an ephemeral client secret, a client that asks for the microphone, and a connection.
          <code>samai-sdk/voice</code> is browser-safe — it imports no <code>node:*</code> modules and
          uses no unguarded <code>Buffer</code> — so <code>npm i samai-sdk</code> is the whole install.
          The long-lived API key never leaves your server: the client holds a short-lived{" "}
          <code>ek_…</code> secret instead.
        </p>
        <p>
          Start with the agent definition, which both sides share. It is safe to import in a client
          component because <code>samai-sdk/voice</code> reaches no Node built-ins:
        </p>
        <CodeBlock code={BROWSER_AGENT_CODE} lang="ts" label="lib/agent.ts" />
        <p>
          Then the server route. This is the only code that touches <code>OPENAI_API_KEY</code>, and it
          calls the GA <code>POST /v1/realtime/client_secrets</code> endpoint:
        </p>
        <CodeBlock code={BROWSER_ROUTE_CODE} lang="ts" label="app/api/realtime-secret/route.ts" />
        <p>
          Finally the client. It fetches the secret, requests the mic itself (so permission errors stay
          its own to surface), and connects over WebRTC — the browser hands its track to the API and
          renders the returned track on an <code>&lt;audio&gt;</code> element, with no base64 PCM
          plumbing and no playback buffer to manage:
        </p>
        <CodeBlock code={BROWSER_CLIENT_CODE} lang="tsx" label="components/VoiceAgent.tsx" />
        <Callout tone="signal" title="Captions, barge-in, and fallback">
          <code>transport: &quot;webrtc&quot;</code> is implied when you pass an <code>inputStream</code>.
          Pass it explicitly to force the choice; without a client secret the transport throws rather
          than shipping a long-lived key to the browser. Turn-taking and barge-in come from
          OpenAI&apos;s server-side VAD, so there is no push-to-talk button — captions arrive on{" "}
          <code>assistant-transcript-delta</code> and <code>user-transcript-delta</code>. On a host
          without <code>RTCPeerConnection</code> (or for a server-side agent), use the WebSocket
          transport instead: <code>openaiRealtime({"{ clientSecret }"})</code>, which owns its
          playback buffer and calls <code>truncateLastResponse()</code> on barge-in.
        </Callout>

        <h2 id="pipeline">Pipeline: STT → LLM → TTS (provider-agnostic)</h2>
        <p>
          <code>pipelineVoice({"{"} stt, llm, tts {"}"})</code> returns a <code>VoiceProvider</code> composable with any
          of the 8 text <code>Provider</code>s. The LLM is just a Provider — swap <code>anthropic()</code> for{" "}
          <code>openai()</code> and nothing else changes. Tools, guardrails, sessions, and tracing all flow through the
          same conversation engine that powers realtime.
        </p>
        <CodeBlock code={PIPELINE_CODE} lang="ts" label="voice-pipeline.ts" />

        <h2 id="engine">Conversation engine &amp; turn-taking</h2>
        <p>
          <code>ConversationEngine</code> is a deterministic state machine —{" "}
          <code>idle → listening → thinking → speaking → interrupted → idle</code> — reused by both pipeline and
          realtime. Barge-in is confidence-gated via <code>VoiceActivityDetector</code> +{" "}
          <code>InterruptionController</code> and cancels the in-flight LLM+TTS with an <code>AbortController</code>;
          low-confidence blips (coughs, TV) are ignored.
        </p>
        <CodeBlock code={ENGINE_CODE} lang="ts" label="voice-engine.ts" />

        <h2 id="behavior">Behavior: goals, clarification, and shaping</h2>
        <p>
          <code>IntentTracker</code> persists goal state via the same <code>Session</code> store used for text chat (so
          voice + text share a store); <code>ClarificationPolicy</code> asks for missing/low-confidence slots before
          calling the LLM; <code>ResponseShaper</code> trims replies for voice (short inputs → short answers) and
          optionally emits backchannels on long turns.
        </p>

        <h2 id="providers">STT/TTS adapters (optional peers)</h2>
        <p>
          <code>deepgramSTT()</code> and <code>elevenLabsTTS()</code> are thin adapters over <code>@deepgram/sdk</code>{" "}
          and <code>elevenlabs</code> — both optional, lazily imported. Nothing in <code>samai-sdk</code> core requires
          them to install or build. In tests or without a key they fall back to a mock transport so the pipeline stays
          testable.
        </p>

        <h2 id="transport">WebRTC transport</h2>
        <p>
          <code>WebRTCVoiceTransport</code> wraps the browser <code>RTCPeerConnection</code> with a
          Node-compatible mock fallback; <code>webrtc-signaling.ts</code> exposes <code>createOffer</code> /{" "}
          <code>handleAnswer</code> / <code>handleOffer</code> / <code>addIceCandidate</code> so you can
          wire any signaling channel (WebSocket, etc.).{" "}
          <code>OpenAIRealtimeWebRTCTransport</code> is the ready-made OpenAI implementation on top of
          it — it does the SDP offer/answer against <code>/v1/realtime/calls</code> for you, and
          <code>stopMediaStream()</code> releases the microphone when the call ends. All of these, plus
          <code>createRealtimeClientSecret</code>, are exported from <code>samai-sdk/voice</code>.
        </p>

        <h2 id="realtime-voiceprovider">Realtime as a VoiceProvider</h2>
        <p>
          <code>openaiRealtime()</code> (in <code>samai-sdk/voice</code>) is a thin <code>VoiceProvider</code>{" "}
          over either transport — WebRTC when you pass an <code>inputStream</code>, WebSocket
          otherwise — same <code>VoiceSession</code> surface as the pipeline, so agents can switch
          transports without changing call sites.
        </p>

        <h2 id="react">React hook</h2>
        <p>
          <code>useVoiceAgent()</code> from <code>samai-sdk/react-voice</code> mirrors <code>useAgent</code> from{" "}
          <code>samai-sdk/react</code> — <code>connect()</code> / <code>disconnect()</code> / <code>sendAudio()</code>{" "}
          / <code>interrupt()</code> plus <code>isSpeaking</code> / <code>isListening</code> / <code>transcript</code>{" "}
          state.
        </p>
        <CodeBlock code={REACT_CODE} lang="tsx" label="VoiceButton.tsx" />

        <h2 id="testing">Testing &amp; observability</h2>
        <p>
          <code>createMockSTTProvider()</code> / <code>createMockTTSProvider()</code> /{" "}
          <code>createMockVoiceTransport()</code> from <code>samai-sdk/voice</code> let you drive the
          full pipeline deterministically — no audio deps, no network. Every <code>VoiceAgentEvent</code>{" "}
          also records into <code>RunTrace</code> as <code>voice-turn</code> / <code>interruption</code> /{" "}
          <code>clarification</code> / <code>goal-update</code> so <code>exportRunTraceToOtel()</code> and{" "}
          <code>renderTraceHTML()</code> work unchanged.
        </p>

        <h2 id="tts">Legacy: TTS / transcription REST</h2>
        <CodeBlock code={TTS_CODE} lang="ts" label="voice-rest.ts" />

        <h2 id="realtime">Raw realtime WebSocket</h2>
        <CodeBlock code={REALTIME_CODE} lang="ts" label="realtime.ts" />
        <p>
          The WebSocket transport, for servers and any host without WebRTC. It handles the
          network/protocol side only — pairing it with actual mic capture and speaker playback is up to
          your app, which is also why it owns the playback buffer and has to call{" "}
          <code>truncateLastResponse(playedMs)</code> when the user barges in (<code>interrupt()</code>{" "}
          does this for you). The global <code>WebSocket</code> is preferred and is all browsers, edge
          runtimes, and Node 22+ need; on Node &lt; 22, or for header-based auth, install the optional{" "}
          <code>ws</code> peer dependency. Without it, connections authenticate via
          OpenAI&apos;s documented subprotocol scheme instead.
        </p>
      </DocPage>
      <DocPager current="/docs/voice" />
    </>
  );
}
