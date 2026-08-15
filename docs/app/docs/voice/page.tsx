import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const TTS_CODE = `import { generateSpeech, transcribeAudio } from "samai-sdk";
import { writeFile, readFile } from "node:fs/promises";

const { audio } = await generateSpeech({ input: "Hello there!", voice: "nova" });
await writeFile("out.mp3", audio);

const { text } = await transcribeAudio({ audio: await readFile("recording.mp3"), filename: "recording.mp3" });`;

const REALTIME_CODE = `import { createRealtimeSession } from "samai-sdk";

const session = createRealtimeSession({
  instructions: "You are a helpful, concise voice assistant.",
  voice: "alloy",
  tools: [getWeatherTool], // any ToolDefinition[] — called automatically when the model invokes them
});

session.on((event) => {
  if (event.type === "audio.delta") playAudioChunk(event.audio); // your speaker output
  if (event.type === "speech_started") stopSpeakerPlayback(); // user talking over the assistant — barge-in
});

await session.connect();
session.sendText("What's the weather in Tokyo?");
session.interrupt(); // cancels the in-flight response, the instant you detect a barge-in
await session.close();`;

export default function VoicePage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Voice / realtime agents"
        description="generateSpeech() and transcribeAudio() wrap OpenAI's TTS and Whisper REST endpoints. createRealtimeSession() opens a bidirectional, streamed voice session with your agent's tools wired in."
      >
        <Callout tone="guard" title="Heads up">
          <code>generateSpeech()</code>/<code>transcribeAudio()</code> are
          straightforward REST calls (same shape as{" "}
          <code>createWebSearchTool()</code>) but haven&apos;t been exercised
          against a live key from this SDK&apos;s dev environment.{" "}
          <code>createRealtimeSession()</code>&apos;s wire-protocol logic{" "}
          <em>has</em> been verified against a real local mock WebSocket
          server — catching and fixing a real race condition and an auth bug
          in the process — but the exact event names/fields haven&apos;t been
          confirmed against OpenAI&apos;s live server, since that API moves
          quickly. Read the disclaimer at the top of{" "}
          <code>src/voice.ts</code> before production use.
        </Callout>

        <h2 id="tts">Text-to-speech and transcription</h2>
        <CodeBlock code={TTS_CODE} lang="ts" label="voice-rest.ts" />

        <h2 id="realtime">Realtime sessions</h2>
        <CodeBlock code={REALTIME_CODE} lang="ts" label="realtime.ts" />

        <p>
          Handles the network/protocol side only — pairing it with actual
          mic capture and speaker playback is up to your app. On Node &lt;
          22, or for header-based auth (recommended), install the optional{" "}
          <code>ws</code> peer dependency; without it, connections fall back
          to OpenAI&apos;s documented subprotocol-based auth, since the
          standard <code>WebSocket</code> global can&apos;t send custom
          headers at all.
        </p>
      </DocPage>
      <DocPager current="/docs/voice" />
    </>
  );
}
