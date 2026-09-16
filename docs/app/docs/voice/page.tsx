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
// engine.getState() // "idle" | "listening" | "thinking" | "speaking" | "interrupted"`;

const TTS_CODE = `import { generateSpeech, transcribeAudio } from "samai-sdk";
import { writeFile, readFile } from "node:fs/promises";

const { audio } = await generateSpeech({ input: "Hello there!", voice: "nova" });
await writeFile("out.mp3", audio);

const { text } = await transcribeAudio({ audio: await readFile("recording.mp3"), filename: "recording.mp3" });`;

const REALTIME_CODE = `import { createRealtimeSession } from "samai-sdk";

const session = createRealtimeSession({
  instructions: "You are a helpful, concise voice assistant.",
  voice: "alloy",
  tools: [getWeatherTool],
});

session.on((event) => {
  if (event.type === "audio.delta") playAudioChunk(event.audio);
  if (event.type === "speech_started") stopSpeakerPlayback();
});

await session.connect();
session.sendText("What's the weather in Tokyo?");
session.interrupt();
await session.close();`;

export default function VoicePage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Voice agents — pipeline, engine, and realtime"
        description="A provider-agnostic pipeline (STT → LLM → TTS), a deterministic conversation engine, plus the existing realtime/WebSocket session — all with mock-based testing and tracing."
      >
        <Callout tone="guard" title="Heads up">
          <code>generateSpeech()</code>/<code>transcribeAudio()</code> are straightforward REST calls (same shape as{" "}
          <code>createWebSearchTool()</code>) but haven&apos;t been exercised against a live key from this SDK&apos;s dev
          environment. <code>createRealtimeSession()</code>&apos;s wire-protocol logic <em>has</em> been verified
          against a real local mock WebSocket server — catching and fixing a real race condition and an auth bug in the
          process — but the exact event names/fields haven&apos;t been confirmed against OpenAI&apos;s live server, since
          that API moves quickly. Read the disclaimer at the top of <code>src/voice.ts</code> before production use.
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
          <code>WebRTCVoiceTransport</code> wraps the browser <code>RTCPeerConnection</code> with a Node-compatible mock
          fallback; <code>webrtc-signaling.ts</code> exposes <code>createOffer</code> / <code>handleAnswer</code> /{" "}
          <code>handleOffer</code> / <code>addIceCandidate</code> so you can wire any signaling channel (WebSocket, etc.).
        </p>

        <h2 id="realtime-voiceprovider">Realtime as a VoiceProvider</h2>
        <p>
          <code>openaiRealtime()</code> (in <code>samai-sdk/voice</code>) is a thin <code>VoiceProvider</code> over the
          existing <code>createRealtimeSession()</code> WebSocket — same <code>VoiceSession</code> surface as the
          pipeline, so agents can switch transports without changing call sites.
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
          <code>createMockVoiceTransport()</code> from <code>samai-sdk/voice/testing</code> let you drive the full
          pipeline deterministically — no audio deps, no network. Every <code>VoiceAgentEvent</code> also records into{" "}
          <code>RunTrace</code> as <code>voice-turn</code> / <code>interruption</code> / <code>clarification</code> /{" "}
          <code>goal-update</code> so <code>exportRunTraceToOtel()</code> and <code>renderTraceHTML()</code> work
          unchanged.
        </p>

        <h2 id="tts">Legacy: TTS / transcription REST</h2>
        <CodeBlock code={TTS_CODE} lang="ts" label="voice-rest.ts" />

        <h2 id="realtime">Legacy: raw realtime WebSocket</h2>
        <CodeBlock code={REALTIME_CODE} lang="ts" label="realtime.ts" />
        <p>
          Handles the network/protocol side only — pairing it with actual mic capture and speaker playback is up to your
          app. On Node &lt; 22, or for header-based auth (recommended), install the optional <code>ws</code> peer
          dependency; without it, connections fall back to OpenAI&apos;s documented subprotocol-based auth.
        </p>
      </DocPage>
      <DocPager current="/docs/voice" />
    </>
  );
}
