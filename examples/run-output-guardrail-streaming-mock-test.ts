import { createClient, defineAgent, runAgentStream } from "../src/index.js";
import type { GenerateOptions, Provider, StreamChunk } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// Provider that streams the answer in two deltas, so we can tell "held then
// emitted once" apart from "streamed live".
const twoDeltaProvider: Provider = {
  name: "test",
  async generate(): Promise<any> { throw new Error("not used"); },
  async *stream(_o: GenerateOptions): AsyncIterable<StreamChunk> {
    yield { type: "text-delta", textDelta: "Hel" };
    yield { type: "text-delta", textDelta: "lo" };
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 } };
  },
};

async function collect(client: any, agent: any) {
  const deltas: string[] = [];
  for await (const e of runAgentStream(client, agent, "hi")) {
    if (e.type === "text-delta") deltas.push(e.textDelta);
  }
  return deltas;
}

async function main() {
  console.log("=== TEST: output guardrails hold text-delta until checked ===");

  // No output guardrails -> live streaming (two deltas).
  const liveClient = createClient({ provider: twoDeltaProvider });
  const plainAgent = defineAgent({ name: "a", instructions: "t", model: "m" });
  const liveDeltas = await collect(liveClient, plainAgent);
  console.log(`  no guardrail deltas: ${JSON.stringify(liveDeltas)}`);
  check("without guardrails, deltas stream live (2)", liveDeltas.length === 2);

  // Passing output guardrail -> held, emitted once with the full text.
  const passGuardrail = async () => ({ allowed: true });
  const guardedClient = createClient({ provider: twoDeltaProvider, outputGuardrails: [passGuardrail] });
  const guardedDeltas = await collect(guardedClient, plainAgent);
  console.log(`  passing guardrail deltas: ${JSON.stringify(guardedDeltas)}`);
  check("with guardrail, text emitted once", guardedDeltas.length === 1);
  check("held text is the full answer", guardedDeltas[0] === "Hello");

  // Blocking output guardrail -> held text is never emitted.
  const blockGuardrail = async () => ({ allowed: false, reason: "nope" });
  const blockClient = createClient({ provider: twoDeltaProvider, outputGuardrails: [blockGuardrail] });
  const blockedDeltas: string[] = [];
  let blocked = false;
  try {
    for await (const e of runAgentStream(blockClient, plainAgent, "hi")) {
      if (e.type === "text-delta") blockedDeltas.push(e.textDelta);
    }
  } catch {
    blocked = true;
  }
  check("blocking guardrail throws", blocked);
  check("blocked run emits no text-delta", blockedDeltas.length === 0);

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 run output-guardrail streaming test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});