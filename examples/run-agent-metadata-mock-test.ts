import { z } from "zod";
import { createClient, defineAgent, runAgent, createUsageLedger } from "../src/index.js";
import type { GenerateOptions, GenerateResult, Provider, StreamChunk } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

const mockProvider: Provider = {
  name: "test",
  async generate() { throw new Error("not used"); },
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // Verify metadata is passed through
    if (options.metadata?.userId) {
      console.log(`  provider stream received metadata.userId: ${options.metadata.userId}`);
    }
    yield { type: "text-delta", textDelta: "hello" };
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
  },
};

async function testMetadataPassedToProvider() {
  console.log("=== TEST: RunAgentOptions.metadata passed to provider stream ===");

  const ledger = createUsageLedger();
  const ledgerProvider = ledger.wrapProvider(mockProvider, ({ metadata }) => metadata?.userId as string);

  const client = createClient({ provider: ledgerProvider });

  const agent = defineAgent({
    name: "meta-agent",
    instructions: "test",
    model: "test-model",
  });

  await runAgent(client, agent, "hello", {
    metadata: { userId: "user-123", sessionId: "sess-456" },
  });

  const stats = ledger.getAllStats();
  check("usage attributed to userId from metadata", stats["user-123"]?.totalTokens > 0);
  check("usage NOT attributed to other keys", Object.keys(stats).length === 1);

  console.log(`  ledger snapshot:`, JSON.stringify(stats, null, 2));
}

async function main() {
  await testMetadataPassedToProvider();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 metadata in runAgent test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});