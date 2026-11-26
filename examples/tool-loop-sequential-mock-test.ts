import { z } from "zod";
import { defineTool, executeToolCalls } from "../src/index.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

const order: string[] = [];
function makeTool(name: string): any {
  return defineTool({
    name,
    description: name,
    parameters: z.object({}),
    execute: async () => {
      order.push(`${name}:start`);
      await new Promise((r) => setTimeout(r, 20));
      order.push(`${name}:end`);
      return name;
    },
  });
}

async function main() {
  console.log("=== TEST: tool calls run one after another (sequential) ===");

  await executeToolCalls(
    [
      { type: "tool-call", toolCallId: "1", toolName: "a", args: {} },
      { type: "tool-call", toolCallId: "2", toolName: "b", args: {} },
    ],
    [makeTool("a"), makeTool("b")]
  );

  console.log(`  order: ${order.join(" -> ")}`);
  check("a fully completes before b starts", order.join(",") === "a:start,a:end,b:start,b:end");

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 tool-loop sequential test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});