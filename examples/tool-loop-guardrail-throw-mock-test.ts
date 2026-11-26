import { z } from "zod";
import { defineTool, executeToolCalls } from "../src/index.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

const echo = defineTool({
  name: "echo",
  description: "echo",
  parameters: z.object({ text: z.string() }),
  execute: async ({ text }) => text,
});

async function main() {
  console.log("=== TEST: a throwing tool guardrail becomes an isError result, not a rejection ===");

  const throwingGuardrail = async () => {
    throw new Error("guardrail blew up");
  };

  let rejected = false;
  let results: Awaited<ReturnType<typeof executeToolCalls>> = [];
  try {
    results = await executeToolCalls(
      [{ type: "tool-call", toolCallId: "c1", toolName: "echo", args: { text: "hi" } }],
      [echo],
      { toolGuardrails: [throwingGuardrail] }
    );
  } catch {
    rejected = true;
  }

  check("executeToolCalls did not reject", !rejected);
  check("returned one result", results.length === 1);
  check("result is flagged isError", results[0]?.isError === true);
  console.log(`  result: ${JSON.stringify(results[0]?.result)}`);
  check("result message mentions the guardrail failure", String(results[0]?.result).includes("guardrail blew up"));

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 tool-loop guardrail-throw test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});