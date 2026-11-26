import { createSession, InMemorySessionStore } from "../src/index.js";
import type { Message } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

async function main() {
  console.log("=== TEST: maxMessages trims at a user-message boundary ===");

  const store = new InMemorySessionStore();
  const session = createSession("s", store, { maxMessages: 3 });

  // A realistic sequence: user, assistant(tool-call), tool(result), assistant(text), user, assistant(text)
  const history: Message[] = [
    { role: "user", content: "q1" },
    { role: "assistant", content: [{ type: "tool-call", toolCallId: "t1", toolName: "x", args: {} }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "t1", toolName: "x", result: "r" }] },
    { role: "assistant", content: "a1" },
    { role: "user", content: "q2" },
    { role: "assistant", content: "a2" },
  ];
  await session.appendMessages(history);

  const trimmed = await session.getMessages();
  console.log(`  original: ${history.length}, trimmed: ${trimmed.length} (maxMessages 3)`);
  check("trimmed to fewer than original", trimmed.length < history.length);
  check("first kept message is a user message", trimmed[0]?.role === "user");
  check("kept slice starts at q2 (the user boundary)", trimmed[0]?.content === "q2");

  // No orphaned tool result: every tool message is preceded by an assistant tool-call.
  let orphan = false;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i].role === "tool") {
      const prev = trimmed[i - 1];
      const prevHasCall = prev?.role === "assistant" && Array.isArray(prev.content) && prev.content.some((p) => p.type === "tool-call");
      if (!prevHasCall) orphan = true;
    }
  }
  check("no orphaned tool-result message", !orphan);

  // Without maxMessages, nothing is trimmed.
  const full = createSession("s2", new InMemorySessionStore());
  await full.appendMessages(history);
  check("no maxMessages keeps full history", (await full.getMessages()).length === history.length);

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 session maxMessages test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});