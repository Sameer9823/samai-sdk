import { createSandbox } from "../src/sandbox.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

async function main() {
  // This test verifies the process-group timeout fix (Item 11).
  // On Windows, process group kill isn't supported, so we skip.
  if (process.platform === "win32") {
    console.log("  ⚠️  Skipping process-group timeout test on Windows (not applicable)");
    console.log("\n🎉 sandbox timeout group test skipped on Windows");
    return;
  }

  console.log("=== TEST: timeout kills process group (not just direct child) ===");

  const sandbox = createSandbox({ timeoutMs: 500 });
  const t0 = Date.now();

  // `bash -c "sleep 6 & wait"` spawns a background sleep (grandchild) then waits.
  // Before the fix, killing only the direct child (bash) left the sleep running,
  // so the 500ms timeout effectively became 6s. After the fix (detached + kill -pgid),
  // the whole group is killed and the call returns in ~500ms.
  const result = await sandbox.runCode({
    language: "bash",
    code: 'sleep 6 & wait',
    timeoutMs: 500,
  });

  const elapsed = Date.now() - t0;

  check("returns within ~1s (not 6s)", elapsed < 3000);
  check("timedOut flag is true", result.timedOut === true);
  check("exitCode is null (killed)", result.exitCode === null);

  console.log(`  elapsed: ${elapsed}ms (expected ~500ms)`);
  console.log(`  timedOut: ${result.timedOut}`);
  console.log(`  exitCode: ${result.exitCode}`);

  await sandbox.close();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 sandbox timeout group test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});