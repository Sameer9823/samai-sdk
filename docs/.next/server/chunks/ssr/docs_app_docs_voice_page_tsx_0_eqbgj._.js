module.exports=[5988,a=>a.a(async(b,c)=>{try{var d=a.i(78918),e=a.i(13855),f=a.i(41215),g=b([f]);[f]=g.then?(await g)():g;let h=`import { pipelineVoice } from "samai-sdk/voice";
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
await session.close();`,i=`import { useVoiceAgent } from "samai-sdk/react-voice";
import { pipelineVoice } from "samai-sdk/voice";

function VoiceButton({ provider, agent }) {
  const { isConnected, isSpeaking, transcript, connect, disconnect, sendAudio, interrupt } =
    useVoiceAgent(provider, agent);
  return (
    <button onClick={isConnected ? disconnect : connect}>
      {isSpeaking ? "Speaking…" : isConnected ? "Listening" : "Connect"}
    </button>
  );
}`,j=`import { ConversationEngine } from "samai-sdk/voice";

const engine = new ConversationEngine({ agent, session, trace });
// engine.handleUserSpeechEnded(transcript, confidence) -> clarification or null
// engine.handleBargeIn({ confidence, durationMs })     -> true if barge-in accepted
// engine.getState() // "idle" | "connecting" | "listening" | "user_speaking" | "thinking"
//                   // | "speaking" | "assistant_speaking" | "interrupting" | "interrupted"
//                   // | "reconnecting" | "error"`,k=`import { generateSpeech, transcribeAudio } from "samai-sdk";
import { writeFile, readFile } from "node:fs/promises";

const { audio } = await generateSpeech({ input: "Hello there!", voice: "nova" });
await writeFile("out.mp3", audio);

const { text } = await transcribeAudio({ audio: await readFile("recording.mp3"), filename: "recording.mp3" });`,l=`import { createRealtimeSession } from "samai-sdk";

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
await session.close();`,m=`// app/api/realtime-secret/route.ts — SERVER ONLY.
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
}`,n=`"use client";
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
}`,o=`// lib/agent.ts — shared by the route and the client. Safe to import in a
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
});`;a.s(["default",0,function(){return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)(e.DocPage,{eyebrow:"Core concepts",title:"Voice agents — pipeline, engine, and realtime",description:"A provider-agnostic pipeline (STT → LLM → TTS), a deterministic conversation engine, and OpenAI Realtime over WebRTC or WebSocket — all with mock-based testing and tracing.",children:[(0,d.jsxs)(e.Callout,{tone:"guard",title:"Realtime is GA, not preview",children:["The Realtime ",(0,d.jsx)("em",{children:"preview"})," API is retired. ",(0,d.jsx)("code",{children:"samai-sdk"})," 0.3.6+ targets the GA interface: default model ",(0,d.jsx)("code",{children:"gpt-realtime"}),", ",(0,d.jsx)("code",{children:'session.type: "realtime"'}),", audio config nested under ",(0,d.jsx)("code",{children:"session.audio.input/output"}),", ephemeral client secrets, and ",(0,d.jsxs)("strong",{children:["no ",(0,d.jsx)("code",{children:"OpenAI-Beta"})," header"]}),". If you were on"," ",(0,d.jsx)("code",{children:"gpt-4o-realtime-preview"}),", move the model and drop any preview-only parameters. See the CHANGELOG's breaking changes."]}),(0,d.jsxs)(e.Callout,{tone:"guard",title:"Heads up",children:[(0,d.jsx)("code",{children:"generateSpeech()"}),"/",(0,d.jsx)("code",{children:"transcribeAudio()"})," are straightforward REST calls (same shape as"," ",(0,d.jsx)("code",{children:"createWebSearchTool()"}),") but haven't been exercised against a live key from this SDK's dev environment. ",(0,d.jsx)("code",{children:"createRealtimeSession()"}),"'s wire-protocol logic ",(0,d.jsx)("em",{children:"has"})," been verified against a real local mock WebSocket server — catching and fixing a real race condition and an auth bug in the process — but the exact event names/fields haven't been confirmed against OpenAI's live server, since that API moves quickly. Read the disclaimer at the top of ",(0,d.jsx)("code",{children:"src/voice.ts"})," before production use."]}),(0,d.jsx)("h2",{id:"browser",children:"Browser quick start (WebRTC)"}),(0,d.jsxs)("p",{children:["A browser voice app needs three things and nothing else from this SDK: a server route that mints an ephemeral client secret, a client that asks for the microphone, and a connection.",(0,d.jsx)("code",{children:"samai-sdk/voice"})," is browser-safe — it imports no ",(0,d.jsx)("code",{children:"node:*"})," modules and uses no unguarded ",(0,d.jsx)("code",{children:"Buffer"})," — so ",(0,d.jsx)("code",{children:"npm i samai-sdk"})," is the whole install. The long-lived API key never leaves your server: the client holds a short-lived"," ",(0,d.jsx)("code",{children:"ek_…"})," secret instead."]}),(0,d.jsxs)("p",{children:["Start with the agent definition, which both sides share. It is safe to import in a client component because ",(0,d.jsx)("code",{children:"samai-sdk/voice"})," reaches no Node built-ins:"]}),(0,d.jsx)(f.CodeBlock,{code:o,lang:"ts",label:"lib/agent.ts"}),(0,d.jsxs)("p",{children:["Then the server route. This is the only code that touches ",(0,d.jsx)("code",{children:"OPENAI_API_KEY"}),", and it calls the GA ",(0,d.jsx)("code",{children:"POST /v1/realtime/client_secrets"})," endpoint:"]}),(0,d.jsx)(f.CodeBlock,{code:m,lang:"ts",label:"app/api/realtime-secret/route.ts"}),(0,d.jsxs)("p",{children:["Finally the client. It fetches the secret, requests the mic itself (so permission errors stay its own to surface), and connects over WebRTC — the browser hands its track to the API and renders the returned track on an ",(0,d.jsx)("code",{children:"<audio>"})," element, with no base64 PCM plumbing and no playback buffer to manage:"]}),(0,d.jsx)(f.CodeBlock,{code:n,lang:"tsx",label:"components/VoiceAgent.tsx"}),(0,d.jsxs)(e.Callout,{tone:"signal",title:"Captions, barge-in, and fallback",children:[(0,d.jsx)("code",{children:'transport: "webrtc"'})," is implied when you pass an ",(0,d.jsx)("code",{children:"inputStream"}),". Pass it explicitly to force the choice; without a client secret the transport throws rather than shipping a long-lived key to the browser. Turn-taking and barge-in come from OpenAI's server-side VAD, so there is no push-to-talk button — captions arrive on"," ",(0,d.jsx)("code",{children:"assistant-transcript-delta"})," and ",(0,d.jsx)("code",{children:"user-transcript-delta"}),". On a host without ",(0,d.jsx)("code",{children:"RTCPeerConnection"})," (or for a server-side agent), use the WebSocket transport instead: ",(0,d.jsxs)("code",{children:["openaiRealtime(","{ clientSecret }",")"]}),", which owns its playback buffer and calls ",(0,d.jsx)("code",{children:"truncateLastResponse()"})," on barge-in."]}),(0,d.jsx)("h2",{id:"pipeline",children:"Pipeline: STT → LLM → TTS (provider-agnostic)"}),(0,d.jsxs)("p",{children:[(0,d.jsxs)("code",{children:["pipelineVoice(","{"," stt, llm, tts ","}",")"]})," returns a ",(0,d.jsx)("code",{children:"VoiceProvider"})," composable with any of the 8 text ",(0,d.jsx)("code",{children:"Provider"}),"s. The LLM is just a Provider — swap ",(0,d.jsx)("code",{children:"anthropic()"})," for"," ",(0,d.jsx)("code",{children:"openai()"})," and nothing else changes. Tools, guardrails, sessions, and tracing all flow through the same conversation engine that powers realtime."]}),(0,d.jsx)(f.CodeBlock,{code:h,lang:"ts",label:"voice-pipeline.ts"}),(0,d.jsx)("h2",{id:"engine",children:"Conversation engine & turn-taking"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"ConversationEngine"})," is a deterministic state machine —"," ",(0,d.jsx)("code",{children:"idle → listening → thinking → speaking → interrupted → idle"})," — reused by both pipeline and realtime. Barge-in is confidence-gated via ",(0,d.jsx)("code",{children:"VoiceActivityDetector"})," +"," ",(0,d.jsx)("code",{children:"InterruptionController"})," and cancels the in-flight LLM+TTS with an ",(0,d.jsx)("code",{children:"AbortController"}),"; low-confidence blips (coughs, TV) are ignored."]}),(0,d.jsx)(f.CodeBlock,{code:j,lang:"ts",label:"voice-engine.ts"}),(0,d.jsx)("h2",{id:"behavior",children:"Behavior: goals, clarification, and shaping"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"IntentTracker"})," persists goal state via the same ",(0,d.jsx)("code",{children:"Session"})," store used for text chat (so voice + text share a store); ",(0,d.jsx)("code",{children:"ClarificationPolicy"})," asks for missing/low-confidence slots before calling the LLM; ",(0,d.jsx)("code",{children:"ResponseShaper"})," trims replies for voice (short inputs → short answers) and optionally emits backchannels on long turns."]}),(0,d.jsx)("h2",{id:"providers",children:"STT/TTS adapters (optional peers)"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"deepgramSTT()"})," and ",(0,d.jsx)("code",{children:"elevenLabsTTS()"})," are thin adapters over ",(0,d.jsx)("code",{children:"@deepgram/sdk"})," ","and ",(0,d.jsx)("code",{children:"elevenlabs"})," — both optional, lazily imported. Nothing in ",(0,d.jsx)("code",{children:"samai-sdk"})," core requires them to install or build. In tests or without a key they fall back to a mock transport so the pipeline stays testable."]}),(0,d.jsx)("h2",{id:"transport",children:"WebRTC transport"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"WebRTCVoiceTransport"})," wraps the browser ",(0,d.jsx)("code",{children:"RTCPeerConnection"})," with a Node-compatible mock fallback; ",(0,d.jsx)("code",{children:"webrtc-signaling.ts"})," exposes ",(0,d.jsx)("code",{children:"createOffer"})," /"," ",(0,d.jsx)("code",{children:"handleAnswer"})," / ",(0,d.jsx)("code",{children:"handleOffer"})," / ",(0,d.jsx)("code",{children:"addIceCandidate"})," so you can wire any signaling channel (WebSocket, etc.)."," ",(0,d.jsx)("code",{children:"OpenAIRealtimeWebRTCTransport"})," is the ready-made OpenAI implementation on top of it — it does the SDP offer/answer against ",(0,d.jsx)("code",{children:"/v1/realtime/calls"})," for you, and",(0,d.jsx)("code",{children:"stopMediaStream()"})," releases the microphone when the call ends. All of these, plus",(0,d.jsx)("code",{children:"createRealtimeClientSecret"}),", are exported from ",(0,d.jsx)("code",{children:"samai-sdk/voice"}),"."]}),(0,d.jsx)("h2",{id:"realtime-voiceprovider",children:"Realtime as a VoiceProvider"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"openaiRealtime()"})," (in ",(0,d.jsx)("code",{children:"samai-sdk/voice"}),") is a thin ",(0,d.jsx)("code",{children:"VoiceProvider"})," ","over either transport — WebRTC when you pass an ",(0,d.jsx)("code",{children:"inputStream"}),", WebSocket otherwise — same ",(0,d.jsx)("code",{children:"VoiceSession"})," surface as the pipeline, so agents can switch transports without changing call sites."]}),(0,d.jsx)("h2",{id:"react",children:"React hook"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"useVoiceAgent()"})," from ",(0,d.jsx)("code",{children:"samai-sdk/react-voice"})," mirrors ",(0,d.jsx)("code",{children:"useAgent"})," from"," ",(0,d.jsx)("code",{children:"samai-sdk/react"})," — ",(0,d.jsx)("code",{children:"connect()"})," / ",(0,d.jsx)("code",{children:"disconnect()"})," / ",(0,d.jsx)("code",{children:"sendAudio()"})," ","/ ",(0,d.jsx)("code",{children:"interrupt()"})," plus ",(0,d.jsx)("code",{children:"isSpeaking"})," / ",(0,d.jsx)("code",{children:"isListening"})," / ",(0,d.jsx)("code",{children:"transcript"})," ","state."]}),(0,d.jsx)(f.CodeBlock,{code:i,lang:"tsx",label:"VoiceButton.tsx"}),(0,d.jsx)("h2",{id:"testing",children:"Testing & observability"}),(0,d.jsxs)("p",{children:[(0,d.jsx)("code",{children:"createMockSTTProvider()"})," / ",(0,d.jsx)("code",{children:"createMockTTSProvider()"})," /"," ",(0,d.jsx)("code",{children:"createMockVoiceTransport()"})," from ",(0,d.jsx)("code",{children:"samai-sdk/voice"})," let you drive the full pipeline deterministically — no audio deps, no network. Every ",(0,d.jsx)("code",{children:"VoiceAgentEvent"})," ","also records into ",(0,d.jsx)("code",{children:"RunTrace"})," as ",(0,d.jsx)("code",{children:"voice-turn"})," / ",(0,d.jsx)("code",{children:"interruption"})," /"," ",(0,d.jsx)("code",{children:"clarification"})," / ",(0,d.jsx)("code",{children:"goal-update"})," so ",(0,d.jsx)("code",{children:"exportRunTraceToOtel()"})," and"," ",(0,d.jsx)("code",{children:"renderTraceHTML()"})," work unchanged."]}),(0,d.jsx)("h2",{id:"tts",children:"Legacy: TTS / transcription REST"}),(0,d.jsx)(f.CodeBlock,{code:k,lang:"ts",label:"voice-rest.ts"}),(0,d.jsx)("h2",{id:"realtime",children:"Raw realtime WebSocket"}),(0,d.jsx)(f.CodeBlock,{code:l,lang:"ts",label:"realtime.ts"}),(0,d.jsxs)("p",{children:["The WebSocket transport, for servers and any host without WebRTC. It handles the network/protocol side only — pairing it with actual mic capture and speaker playback is up to your app, which is also why it owns the playback buffer and has to call"," ",(0,d.jsx)("code",{children:"truncateLastResponse(playedMs)"})," when the user barges in (",(0,d.jsx)("code",{children:"interrupt()"})," ","does this for you). The global ",(0,d.jsx)("code",{children:"WebSocket"})," is preferred and is all browsers, edge runtimes, and Node 22+ need; on Node < 22, or for header-based auth, install the optional"," ",(0,d.jsx)("code",{children:"ws"})," peer dependency. Without it, connections authenticate via OpenAI's documented subprotocol scheme instead."]})]}),(0,d.jsx)(e.DocPager,{current:"/docs/voice"})]})}]),c()}catch(a){c(a)}},!1),30533,function(a){a.n(a.i(5988))}];

//# sourceMappingURL=docs_app_docs_voice_page_tsx_0_eqbgj._.js.map