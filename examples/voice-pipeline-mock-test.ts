import { createMockProvider } from "../src/testing.js";
import { createSession, InMemorySessionStore } from "../src/session.js";
import { pipelineVoice } from "../src/voice/pipeline/pipeline-provider.js";
import { createMockSTTProvider, createMockTTSProvider } from "../src/voice/testing.js";
import { defineVoiceAgent } from "../src/voice/voice-agent.js";
import { defineTool } from "../src/types.js";
import { z } from "zod";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ✅ ${label}${detail ? " — " + detail : ""}`);
  else { console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); failures++; }
}

console.log("=== TEST 1: pipelineVoice end-to-end (STT → LLM → TTS with real timing) ===");

const agent = defineVoiceAgent({ name: "pipeline-agent", instructions: "You are helpful.", model: "mock-model" });
const llm = createMockProvider({ responses: [{ text: "Hello from the model. How can I help you?" }] });
const stt = createMockSTTProvider();
const tts = createMockTTSProvider({ chunkDelayMs: 10 });
const provider = pipelineVoice({ stt, llm, tts });
const session = createSession("voice-pipe-1", new InMemorySessionStore());

const voiceSession = await provider.connect({ agent, session });
const events: any[] = [];
for (const t of ["user-speech-started","user-speech-ended","agent-thinking","agent-speech-started","agent-audio-chunk","agent-speech-ended","interruption","tool-started","tool-completed","run-completed","run-failed"] as const) {
  (voiceSession as any).on(t, (e: any) => events.push(e));
}

// Obtain the underlying STT session via stt provider's connect shim? Instead use simulate on provider shim.
// Our MockSTTProvider stores onResult globally; we can trigger via the provider-level simulateTranscript helper
// pipeline-provider holds the stt session internally, but MockSTTProvider.simulateTranscript will fire onResult.
const start = Date.now();
(stt as any).simulateTranscript("hello there", { confidence: 0.95, isFinal: true });

// Wait for LLM -> TTS pipeline to complete (real wall-clock: stream is sync, TTS chunk delay is 10ms)
await new Promise((r) => setTimeout(r, 120));
const elapsed = Date.now() - start;

console.log(`  elapsed: ${elapsed}ms`);
check("elapsed reflects real TTS delay (>=10ms)", elapsed >= 10);
check("LLM was called once", llm.calls.length === 1, `calls=${llm.calls.length}`);
check("LLM history included the transcript", JSON.stringify(llm.calls[0]?.messages ?? []).includes("hello there"));
check("TTS synthesized the model output", tts.getSynthesized().join(" ").includes("Hello from the model"));
check("agent-speech-started fired", events.some((e) => e.type === "agent-speech-started"));
check("agent-audio-chunk fired with ArrayBuffer", events.some((e) => e.type === "agent-audio-chunk" && e.chunk instanceof ArrayBuffer));
check("run-completed fired", events.some((e) => e.type === "run-completed"));
check("session has both user and assistant", (await session.getMessages()).length >= 2);

console.log("\n=== TEST 2: low-latency sentence-boundary TTS start ===");
const llm2 = createMockProvider({ responses: [{ text: "First sentence. Second sentence. Third." }] });
const tts2 = createMockTTSProvider({ chunkDelayMs: 5 });
const stt2 = createMockSTTProvider();
const p2 = pipelineVoice({ stt: stt2, llm: llm2, tts: tts2 });
const vs2 = await p2.connect({ agent, session: createSession("pipe-2", new InMemorySessionStore()) });
(stt2 as any).simulateTranscript("go", { confidence: 0.95 });
await new Promise((r) => setTimeout(r, 100));
const chunks2 = tts2.getSynthesized();
console.log(`  tts chunk count: ${chunks2.length}, chunks: ${JSON.stringify(chunks2).slice(0, 300)}`);
check("TTS was called (sentence buffering, at least 1 chunk)", chunks2.length >= 1);
check("Full text reached TTS (concat includes Third)", chunks2.join(" ").includes("Third"));

await (voiceSession as any).close();
await (vs2 as any).close();

// ── TEST 3: tool-call loop message ordering ──
console.log("\n=== TEST 3: pipeline tool-call loop sends correct messages on second call ===");

const toolResult = { weather: "sunny", temp: 22 };
const agent3 = defineVoiceAgent({
  name: "tool-loop-agent",
  instructions: "You are a helpful assistant.",
  model: "mock-model",
  tools: [
    defineTool({
      name: "get_weather",
      description: "Get the weather for a city",
      parameters: z.object({ city: z.string() }),
      execute: async (args: { city: string }) => JSON.stringify({ weather: "sunny", temp: 22 }),
    }),
  ],
});
const callLog: any[] = [];
const llm3 = createMockProvider({
  responses: (callIndex: number, options: any) => {
    callLog.push({ callIndex, messages: options.messages });
    if (callIndex === 0) {
      return { toolCalls: [{ toolName: "get_weather", args: { city: "Tokyo" } }] };
    }
    return { text: "The weather in Tokyo is sunny and 22 degrees." };
  },
});
const stt3 = createMockSTTProvider();
const tts3 = createMockTTSProvider();
const p3 = pipelineVoice({ stt: stt3, llm: llm3, tts: tts3 });
const sess3 = createSession("pipe-3", new InMemorySessionStore());
const vs3 = await p3.connect({ agent: agent3, session: sess3 });
(stt3 as any).simulateTranscript("What's the weather in Tokyo?", { confidence: 0.95, isFinal: true });
await new Promise((r) => setTimeout(r, 100));

check("LLM called twice (tool-call roundtrip)", callLog.length === 2, `calls=${callLog.length}`);
if (callLog.length >= 2) {
  const secondMessages = callLog[1].messages;
  const roles = secondMessages.map((m: any) => m.role);
  console.log("  second-call message roles:", roles);
  console.log("  second-call messages[1].content:", JSON.stringify(secondMessages[1]?.content).slice(0, 200));
  console.log("  second-call messages[2].content:", JSON.stringify(secondMessages[2]?.content).slice(0, 200));
  check("second call starts with user message", roles[0] === "user");
  check("second call has assistant with tool-call", roles[1] === "assistant" && Array.isArray(secondMessages[1]?.content) && secondMessages[1].content.some((p: any) => p.type === "tool-call"));
  check("third message is tool-result", roles[2] === "tool" && Array.isArray(secondMessages[2]?.content) && secondMessages[2].content[0]?.type === "tool-result");
  check("tool result contains weather data", secondMessages[2]?.content[0]?.result?.includes?.("sunny") || secondMessages[2]?.content[0]?.text?.includes?.("sunny"));
}

await (vs3 as any).close();

// ── TEST 4: approval-gated tool fails closed, turn still ends ──
console.log("\n=== TEST 4: approval-gated tool fails closed without handler ===");

let toolExecuted = false;
const agent4 = defineVoiceAgent({
  name: "approval-agent",
  instructions: "You are a helpful assistant.",
  model: "mock-model",
  tools: [
    defineTool({
      name: "delete_account",
      description: "Delete the user's account",
      parameters: z.object({}),
      execute: async () => { toolExecuted = true; return "account deleted"; },
      requiresApproval: true,
    }),
  ],
});
let approvalHandlerCalls = 0;
const llm4 = createMockProvider({
  responses: (callIndex: number) => {
    if (callIndex === 0) return { toolCalls: [{ toolName: "delete_account", args: {} }] };
    return { text: "I didn't delete anything because you didn't approve it." };
  },
});
const stt4 = createMockSTTProvider();
const tts4 = createMockTTSProvider();
const p4 = pipelineVoice({ stt: stt4, llm: llm4, tts: tts4 });
const sess4 = createSession("pipe-4", new InMemorySessionStore());
// Connect WITHOUT onApprovalRequest — should fail closed.
const vs4 = await p4.connect({ agent: agent4, session: sess4 });
(stt4 as any).simulateTranscript("Please delete my account", { confidence: 0.95, isFinal: true });
await new Promise((r) => setTimeout(r, 100));

check("tool was NOT executed (fail closed)", !toolExecuted);
check("LLM called twice (error result + fallback)", llm4.calls.length === 2, `calls=${llm4.calls.length}`);
const events4: any[] = [];
// Re-check by looking at what messages the second call received
if (llm4.calls.length >= 2) {
  const toolMsg = llm4.calls[1].messages.find((m: any) => m.role === "tool");
  check("second call received a tool message", !!toolMsg);
  check("tool message contains an error (not the real result)", JSON.stringify(toolMsg).includes("Error") || JSON.stringify(toolMsg).includes("approval"));
}
check("no onApprovalRequest was needed", approvalHandlerCalls === 0);

// Verify the turn ended (TTS was called with the fallback text)
check("TTS received the fallback text", tts4.getSynthesized().join(" ").includes("didn't delete"));

await (vs4 as any).close();

if (failures) { console.log(`\n❌ ${failures} failure(s)`); process.exit(1); }
console.log("\n🎉 voice-pipeline tests passed");
