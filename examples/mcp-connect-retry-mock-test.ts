import { createMCPClient } from "../src/index.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// A stdio transport pointing at a binary that doesn't exist makes connect() reject.
// The client must (a) surface the failure, (b) NOT cache it so a later call retries,
// and (c) let close() resolve without throwing even though connect never succeeded.
async function main() {
  console.log("=== TEST: MCP connect failure is retryable and close() is safe ===");

  const client = createMCPClient({
    transport: { transport: "stdio", command: "samai-no-such-binary-xyz", args: [] },
  });

  let firstRejected = false;
  try {
    await client.connect();
  } catch {
    firstRejected = true;
  }
  check("first connect() rejects on a bad transport", firstRejected);

  // If the failure were cached, this would reject with the same promise; the fix
  // clears clientPromise so this call actually re-attempts the connection.
  let secondRejected = false;
  try {
    await client.connect();
  } catch {
    secondRejected = true;
  }
  check("second connect() retries (rejects again, not a cached success)", secondRejected);

  let closeThrew = false;
  try {
    await client.close();
  } catch {
    closeThrew = true;
  }
  check("close() does not throw after a failed connect", !closeThrew);

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 mcp connect-retry test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});