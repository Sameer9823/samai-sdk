import { createClient, createMockProvider, createSession, defineAgent, runAgentStream, InMemorySessionStore } from "../src/index.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// Breaking out of runAgentStream at run-completed must not lose the turn:
// the session must already contain the messages by the time the event surfaces.
async function main() {
  console.log("=== TEST: breaking at run-completed preserves session messages ===");

  const provider = createMockProvider({ responses: [{ text: "Hello there." }] });
  const client = createClient({ provider });
  const store = new InMemorySessionStore();
  const session = createSession("s1", store);
  const agent = defineAgent({ name: "a", instructions: "test", model: "test-model" });

  for await (const event of runAgentStream(client, agent, "hi", { session })) {
    if (event.type === "run-completed") break;
  }

  const persisted = await session.getMessages();
  console.log(`  session message count after break: ${persisted.length} (expected 2: user + assistant)`);
  check("session has the user message", persisted.some((m) => m.role === "user"));
  check("session has the assistant message", persisted.some((m) => m.role === "assistant"));

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 run-completed ordering test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});