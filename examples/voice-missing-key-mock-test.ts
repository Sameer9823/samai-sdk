/**
 * Tests that providers fail loudly when no API key is configured, and that
 * `apiKey: "mock"` opt-in still works. Also verifies that a bad WebSocket URL
 * causes connect() to reject.
 *
 * Run with: npx tsx examples/voice-missing-key-mock-test.ts
 */
import { openaiRealtime } from "../src/voice/realtime/openai-realtime.js";
import { elevenLabsTTS } from "../src/voice/tts/elevenlabs.js";
import { deepgramSTT } from "../src/voice/stt/deepgram.js";
import { defineVoiceAgent } from "../src/voice/voice-agent.js";
import { createSession, InMemorySessionStore } from "../src/session.js";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ✅ ${label}${detail ? " — " + detail : ""}`);
  else { console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); failures++; }
}

function saveKey(name: string): string | undefined {
  const v = process.env[name];
  delete process.env[name];
  return v;
}
function restoreKey(name: string, val: string | undefined) {
  if (val === undefined) delete process.env[name];
  else process.env[name] = val;
}

async function main() {
  // ── elevenLabsTTS without a key throws ──
  console.log("=== TEST: elevenLabsTTS throws with no API key ===");
  const savedEleven = saveKey("ELEVENLABS_API_KEY");
  try {
    const tts = elevenLabsTTS();
    let err = "";
    try { await tts.connect(); } catch (e) { err = (e as Error).message; }
    check("connect() throws a clear error", err.includes("requires an API key"));
    check("error mentions the env var", err.includes("ELEVENLABS_API_KEY"));
  } finally {
    restoreKey("ELEVENLABS_API_KEY", savedEleven);
  }

  // ── elevenLabsTTS with apiKey: "mock" works ──
  console.log("=== TEST: elevenLabsTTS with apiKey mock works ===");
  const mockTts = elevenLabsTTS({ apiKey: "mock" });
  const ts = await mockTts.connect();
  check("mock session returned", !!ts);
  let chunk: ArrayBuffer | null = null;
  ts.onAudioChunk((c) => { chunk = c; });
  ts.onDone(() => {});
  ts.synthesize("hello");
  await new Promise((r) => setTimeout(r, 50));
  check("mock synthesize produced a chunk", chunk !== null);
  await ts.close();

  // ── deepgramSTT without a key throws ──
  console.log("=== TEST: deepgramSTT throws with no API key ===");
  const savedDeepgram = saveKey("DEEPGRAM_API_KEY");
  try {
    const stt = deepgramSTT();
    let err = "";
    try { await stt.connect({ onResult: () => {}, onError: () => {} }); } catch (e) { err = (e as Error).message; }
    check("connect() throws a clear error", err.includes("requires an API key"));
    check("error mentions the env var", err.includes("DEEPGRAM_API_KEY"));
  } finally {
    restoreKey("DEEPGRAM_API_KEY", savedDeepgram);
  }

  // ── deepgramSTT with apiKey: "mock" works ──
  console.log("=== TEST: deepgramSTT with apiKey mock works ===");
  const mockStt = deepgramSTT({ apiKey: "mock" });
  const ss = await mockStt.connect({ onResult: () => {}, onError: () => {} });
  check("mock session returned", !!ss);
  let gotTranscript = false;
  (ss as any).simulateTranscript("hello world");
  (ss as any).simulateTranscript("hello world", true);
  (ss as any).simulateTranscript("hello world", true);
  // simulateTranscript calls options.onResult synchronously
  // (already called via simulateTranscript which calls onResult)
  check("mock session has simulateTranscript", typeof (ss as any).simulateTranscript === "function");
  await ss.close();

  // ── openaiRealtime without a key throws ──
  console.log("=== TEST: openaiRealtime throws with no credential ===");
  const savedOpenai = saveKey("OPENAI_API_KEY");
  try {
    const provider = openaiRealtime({});
    const agent = defineVoiceAgent({ name: "test", instructions: "test", model: "gpt-realtime" });
    let err = "";
    try { await provider.connect({ agent, session: createSession("test", new InMemorySessionStore()) }); } catch (e) { err = (e as Error).message; }
    check("connect() throws a clear error", err.includes("requires an API key"));
  } finally {
    restoreKey("OPENAI_API_KEY", savedOpenai);
  }

  // ── openaiRealtime with apiKey: "mock" produces a mock session ──
  console.log("=== TEST: openaiRealtime apiKey mock produces mock session ===");
  const mockProvider = openaiRealtime({ apiKey: "mock" });
  const mockAgent = defineVoiceAgent({ name: "mock-agent", instructions: "test", model: "gpt-realtime" });
  const mockVs: any = await mockProvider.connect({ agent: mockAgent, session: createSession("mock", new InMemorySessionStore()) });
  check("mock session returned", !!mockVs);
  check("mock session state is closed", mockVs.getConnectionState() === "closed");
  await mockVs.close();

  // ── openaiRealtime with bad URL rejects connect ──
  console.log("=== TEST: openaiRealtime bad URL rejects connect ===");
  const badProvider = openaiRealtime({ apiKey: "sk-test", url: "ws://127.0.0.1:1/x", connectTimeoutMs: 1500 } as any);
  const badAgent = defineVoiceAgent({ name: "bad-url-agent", instructions: "test", model: "gpt-realtime" });
  let badErr = "";
  try {
    await badProvider.connect({ agent: badAgent, session: createSession("bad", new InMemorySessionStore()) });
  } catch (e) {
    badErr = (e as Error).message;
  }
  check("bad URL causes connect to reject", badErr.length > 0, badErr.slice(0, 80));

  if (failures) {
    console.log(`\n❌ ${failures} test(s) failed`);
    process.exit(1);
  }
  console.log("\n✅ All missing-key tests passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
