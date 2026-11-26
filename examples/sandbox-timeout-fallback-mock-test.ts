import { createSandbox } from "../src/sandbox.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

async function main() {
  console.log("=== TEST: timeout resolves even if 'close' is delayed by a lingering grandchild ===");

  // The JS child spawns a DETACHED grandchild that inherits the stdio pipe and
  // outlives it, then exits. The direct child exits immediately, but the pipe
  // stays open (held by the grandchild), so "close" is delayed ~5s. The timeout
  // kill + 1s fallback must resolve the run well before that.
  const sandbox = createSandbox({ timeoutMs: 500 });
  const t0 = Date.now();
  const result = await sandbox.runCode({
    language: "javascript",
    code:
      'import { spawn } from "node:child_process";\n' +
      'const g = spawn(process.execPath, ["-e", "setTimeout(()=>{},5000)"], { stdio: "inherit", detached: true });\n' +
      'g.unref();\n' +
      'process.exit(0);\n',
    timeoutMs: 500,
  });
  const elapsed = Date.now() - t0;

  console.log(`  elapsed: ${elapsed}ms, timedOut: ${result.timedOut}`);
  check("resolved within timeout + ~2s (not ~5s)", elapsed < 3000);
  check("timedOut flag is true", result.timedOut === true);

  await sandbox.close();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 sandbox timeout-fallback test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});