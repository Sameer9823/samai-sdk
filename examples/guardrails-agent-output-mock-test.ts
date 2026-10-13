import { z } from "zod";
import { createClient, defineAgent, runAgent, createBudgetGuardrail } from "../src/index.js";
import type { GenerateOptions, GenerateResult, Provider, StreamChunk } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// Mock provider that always produces the same text
const mockProvider: Provider = {
  name: "test",
  async generate() { throw new Error("not used"); },
  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    yield { type: "text-delta", textDelta: "SECRET_API_KEY_12345" };
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } };
  },
};

const client = createClient({ provider: mockProvider });

async function testBlocklistOutputGuardrail() {
  console.log("=== TEST: client blocklist output guardrail blocks runAgent ===");

  // Blocklist that catches "SECRET_API_KEY"
  const blocklistGuardrail: (options: { result: any }) => Promise<{ allowed: boolean; reason?: string }> = async ({ result }) => {
    if (result.text.includes("SECRET_API_KEY")) {
      return { allowed: false, reason: "contains secret key" };
    }
    return { allowed: true };
  };

  const guardedClient = createClient({
    provider: mockProvider,
    outputGuardrails: [blocklistGuardrail],
  });

  const agent = defineAgent({
    name: "test-agent",
    instructions: "You are a test agent",
    model: "test-model",
  });

  let blocked = false;
  try {
    await runAgent(guardedClient, agent, "tell me the secret");
  } catch (err) {
    // GuardrailBlockedError is wrapped in AgentRunError
    const agentErr = err as any;
    if (agentErr.cause?.name === "GuardrailBlockedError" && agentErr.cause.message.includes("secret")) {
      blocked = true;
    } else if (err instanceof Error && err.name === "GuardrailBlockedError" && err.message.includes("secret")) {
      blocked = true;
    } else {
      throw err;
    }
  }

  check("runAgent was blocked by client output guardrail", blocked);
}

async function testBudgetGuardrailRecordsUsage() {
  console.log("=== TEST: budget output guardrail records usage during runAgent ===");

  const budget = createBudgetGuardrail({ maxCostUsd: 1.0 });
  const usageClient = createClient({
    provider: mockProvider,
    outputGuardrails: [budget.outputGuardrail],
  });

  const agent = defineAgent({
    name: "usage-agent",
    instructions: "test",
    model: "gpt-4o-mini",
  });

  await runAgent(usageClient, agent, "hello");

  const stats = budget.getStats();
  check("budget recorded tokens > 0", stats.totalTokens > 0);
  check("budget recorded cost > 0", stats.totalCostUsd > 0);

  console.log(`  recorded tokens: ${stats.totalTokens}`);
  console.log(`  recorded cost: $${stats.totalCostUsd.toFixed(6)}`);
}

async function main() {
  await testBlocklistOutputGuardrail();
  await testBudgetGuardrailRecordsUsage();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 client output guardrail in runAgent tests passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});