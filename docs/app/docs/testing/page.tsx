import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `import { createClient, defineAgent, runAgent, createMockProvider } from "samai-sdk";

const mock = createMockProvider({
  responses: [
    { toolCalls: [{ toolName: "get_weather", args: { city: "Tokyo" } }] },
    { text: "It's 18°C and cloudy in Tokyo." },
  ],
});

const client = createClient({ provider: mock });
const result = await runAgent(client, myAgent, "What's the weather in Tokyo?");

// every GenerateOptions this provider was called with, in order:
console.log(mock.calls.length); // 2
console.log(result.output);     // "It's 18°C and cloudy in Tokyo."

mock.reset(); // clears the call log so the same mock instance can be reused across test cases`;

const VOICE_CODE = `import { pipelineVoice } from "samai-sdk/voice";
import { createMockSTTProvider, createMockTTSProvider } from "samai-sdk/voice/testing";
import { createMockProvider } from "samai-sdk/testing";
import { defineVoiceAgent } from "samai-sdk/voice";

const stt = createMockSTTProvider();
const tts = createMockTTSProvider();
const llm = createMockProvider({ responses: [{ text: "Hello there!" }] });

const provider = pipelineVoice({ stt, llm, tts });
const agent = defineVoiceAgent({ name: "greeter", instructions: "Be brief.", model: "mock" });
const session = await provider.connect({ agent });

session.on("agent-speech-ended", () => console.log("TTS done"));
stt.simulateTranscript("hi there", { confidence: 0.98 }); // drives STT→LLM→TTS deterministically

// also: createMockVoiceTransport() for WebRTC transport tests
// no audio deps, no network — fully deterministic`;

export default function TestingPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="Testing your agents"
        description="createMockProvider() ships in the SDK so you don't have to hand-roll a fake Provider for your own tests."
      >
        <CodeBlock code={CODE} lang="ts" label="mock-provider.ts" />

        <Callout tone="signal" title="Scripted responses">
          Each entry in <code>responses</code> can set <code>text</code>,{" "}
          <code>toolCalls</code>, <code>finishReason</code>,{" "}
          <code>usage</code>, <code>delayMs</code> (simulate latency), or{" "}
          <code>error</code> (simulate a provider failure). Pass a function
          instead of an array if a turn&apos;s response needs to depend on
          what the agent loop actually sent.
        </Callout>

        <h2 id="voice-mocks">Voice pipeline mocks</h2>
        <p>
          <code>createMockSTTProvider()</code> / <code>createMockTTSProvider()</code> /{" "}
          <code>createMockVoiceTransport()</code> (from <code>samai-sdk/voice/testing</code>) let you drive the full
          STT→LLM→TTS pipeline deterministically — <code>simulateTranscript()</code> feeds a transcript, the pipeline
          calls the LLM and then TTS, and you can assert on events. No audio libraries or network required.
        </p>
        <CodeBlock code={VOICE_CODE} lang="ts" label="voice-mocks.ts" />
      </DocPage>
      <DocPager current="/docs/testing" />
    </>
  );
}
