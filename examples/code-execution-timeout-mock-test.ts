import { createCodeExecutionTool } from "../src/index.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

async function main() {
  console.log("=== TEST: execute_code tool timeout = sandbox timeout + 5s ===");

  // The tool's own timeout must exceed the sandbox timeout so the sandbox's
  // timeout (with stdout + timedOut) wins over a generic tool timeout.
  check("default tool timeout is 35000 (30000 + 5000)", createCodeExecutionTool().timeoutMs === 35000);
  check("custom tool timeout is sandbox + 5000", createCodeExecutionTool({ timeoutMs: 1000 }).timeoutMs === 6000);

  // Behavioral: a JS snippet that outlives the sandbox timeout returns the
  // sandbox's own timed-out result, not a thrown tool-timeout error.
  const tool = createCodeExecutionTool({ timeoutMs: 1000 });
  const start = Date.now();
  const result = await tool.execute({ language: "javascript", code: "setTimeout(() => {}, 10000);" });
  const elapsed = Date.now() - start;
  console.log(`  elapsed: ${elapsed}ms, result: ${JSON.stringify(result)}`);
  check("returned the sandbox result (mentions timed out)", result.includes("(timed out)"));
  check("did not wait for the full tool timeout (well under 6000ms)", elapsed < 5000);

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 code-execution timeout test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});