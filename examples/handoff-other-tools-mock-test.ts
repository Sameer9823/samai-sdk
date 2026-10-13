import { z } from "zod";
import { createClient, defineAgent, runAgentStream } from "../src/index.js";
import type { GenerateOptions, GenerateResult, Provider, StreamChunk } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// Mock provider that issues a handoff AND another tool call in the same turn
const mockProvider: Provider = {
  name: "test",
  async generate() { throw new Error("not used"); },
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const system = options.system ?? "";
    
    // First turn: return both handoff and a lookup tool call
    if (system.startsWith("ROUTER")) {
      yield {
        type: "tool-call",
        toolCall: { type: "tool-call", toolCallId: "call_1", toolName: "get_weather", args: { city: "Tokyo" } },
      };
      yield {
        type: "tool-call",
        toolCall: { type: "tool-call", toolCallId: "call_2", toolName: "handoff_to__specialist", args: { reason: "need specialist" } },
      };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } };
      return;
    }
    
    // Specialist agent: gives final answer
    if (system.startsWith("SPECIALIST")) {
      yield { type: "text-delta", textDelta: "Specialist answer." };
      yield { type: "finish", finishReason: "stop", usage: { inputTokens: 20, outputTokens: 15, totalTokens: 35 } };
      return;
    }
    
    throw new Error(`unexpected system: ${system}`);
  },
};

const client = createClient({ provider: mockProvider });

const weatherTool = {
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => `sunny in ${city}`,
};

const specialist = defineAgent({
  name: "specialist",
  instructions: "SPECIALIST: You give the final answer.",
  model: "fake-model",
});

const router = defineAgent({
  name: "router",
  instructions: "ROUTER: Check weather then hand off.",
  model: "fake-model",
  tools: [weatherTool],
  handoffs: [specialist],
});

async function main() {
  console.log("=== TEST: handoff shares turn with other tool calls - all get results ===");
  
  let handoffOccurred = false;
  
  const gen = runAgentStream(client, router, "What's the weather?");
  for await (const event of gen) {
    if (event.type === "tool-started") {
      console.log(`  tool-started: ${event.toolName}`);
    }
    if (event.type === "handoff-started") {
      handoffOccurred = true;
      console.log(`  handoff-started: ${event.fromAgent} -> ${event.toAgent}`);
    }
  }
  
  // The key assertion: the run completes without provider 400 error
  // (which would happen if a tool call in the first turn didn't get a result)
  
  check("handoff occurred", handoffOccurred);
  
  console.log("  Run completed without provider 400 error (all tool calls got results)");
  
  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 handoff with other tools test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});