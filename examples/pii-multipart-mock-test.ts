import {
  createPiiInputGuardrail,
  createPiiOutputGuardrail,
} from "../src/guardrails/index.js";
import type { Message } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

async function main() {
  console.log("=== TEST: PII guardrail multi-part messages ===");

  // --- Input guardrail: multi-part string content (redact) ---
  const inputGuard = createPiiInputGuardrail({ mode: "redact" });

  const multipartStringMsg: Message = {
    role: "user",
    content: "My email is john@example.com and my SSN is 123-45-6789.",
  };

  const stringResult = await inputGuard({ messages: [multipartStringMsg] });
  const stringContent = typeof stringResult.modifiedMessages?.[0].content === "string"
    ? stringResult.modifiedMessages?.[0].content as string
    : "";
  check(
    "string content: PII redacted in result",
    stringResult.allowed === true &&
      !stringContent.includes("john@example.com") &&
    stringContent.includes("[REDACTED_EMAIL]") &&
    stringContent.includes("[REDACTED_SSN")
  );

  // --- Input guardrail: multi-part structured content (redact) ---
  const structuredMsg: Message = {
    role: "user",
    content: [
      { type: "text", text: "My name is John Doe." },
      { type: "image", image: "base64data", mimeType: "image/png" },
      { type: "text", text: "Contact: jane@example.com or call 555-123-4567" },
      { type: "tool-call", toolCallId: "tc1", toolName: "lookup", args: {} as any },
    ],
  };

  const structuredResult = await inputGuard({ messages: [structuredMsg] });
  check("structured content: allowed after redaction", structuredResult.allowed === true);

  const modifiedContent = structuredResult.modifiedMessages?.[0].content as any[];
  check("structured content: still 4 parts", modifiedContent?.length === 4);

  const textParts = modifiedContent?.filter((p: any) => p.type === "text");
  check("structured content: 2 text parts preserved", textParts?.length === 2);

  // Each text part should have its own PII redacted independently
  check(
    "structured content: text part 1 unchanged (no PII)",
    textParts?.[0]?.text === "My name is John Doe."
  );

  check(
    "structured content: text part 2 has email and phone redacted",
    textParts?.[1]?.text === "Contact: [REDACTED_EMAIL] or call [REDACTED_PHONE]"
  );

  // Verify image and tool-call parts are preserved untouched
  const imagePart = modifiedContent?.find((p: any) => p.type === "image");
  check("structured content: image part preserved", imagePart?.image === "base64data");

  const toolCallPart = modifiedContent?.find((p: any) => p.type === "tool-call");
  check("structured content: tool-call part preserved", toolCallPart?.toolName === "lookup");

  // --- Input guardrail: block mode ---
  const blockGuard = createPiiInputGuardrail({ mode: "block" });
  const blockResult = await blockGuard({
    messages: [{ role: "user", content: "Email: secret@test.com" }],
  });
  check("block mode: rejected with reason", blockResult.allowed === false);
  check("block mode: reason mentions PII", blockResult.reason?.includes("PII") === true);

  // --- Input guardrail: selective types ---
  const emailOnlyGuard = createPiiInputGuardrail({
    types: ["email"],
    mode: "redact",
  });
  const selectiveResult = await emailOnlyGuard({
    messages: [{ role: "user", content: "email: a@b.com, ssn: 123-45-6789" }],
  });
  const selectiveContent = typeof selectiveResult.modifiedMessages?.[0].content === "string"
    ? selectiveResult.modifiedMessages?.[0].content as string
    : "";
  check(
    "selective types: only email redacted, SSN left intact",
    selectiveContent.includes("[REDACTED_EMAIL]") &&
    selectiveContent.includes("123-45-6789")
  );

  // --- Input guardrail: non-user messages untouched ---
  const systemMsg: Message = {
    role: "system",
    content: "Contact admin at admin@example.com",
  };
  const systemResult = await emailOnlyGuard({ messages: [systemMsg] });
  check("non-user messages: not modified", systemResult.modifiedMessages === undefined);

  // --- Output guardrail ---
  const outputGuard = createPiiOutputGuardrail({ mode: "redact" });
  const outputResult = await outputGuard({
    result: {
      model: "test",
      text: "Your SSN is 123-45-6789.",
      toolCalls: [],
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
      messages: [],
      raw: null,
    },
  });
  check(
    "output guardrail: SSN redacted in result text",
    outputResult.allowed === true &&
    outputResult.modifiedResult?.text !== undefined &&
    outputResult.modifiedResult?.text.includes("[REDACTED_SSN") &&
    !outputResult.modifiedResult?.text.includes("123-45-6789")
  );

  // --- No PII messages pass through unchanged ---
  const cleanResult = await inputGuard({
    messages: [{ role: "user", content: "Hello, how are you?" }],
  });
  check("clean messages: allowed, no modifications", cleanResult.allowed === true && cleanResult.modifiedMessages === undefined);

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 PII multi-part message tests passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
