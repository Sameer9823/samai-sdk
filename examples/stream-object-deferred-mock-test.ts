import { z } from "zod";
import { createClient, streamObject } from "../src/index.js";
import type { GenerateOptions, GenerateResult, Provider, StreamChunk } from "../src/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// Mock provider that streams valid JSON
const mockProvider: Provider = {
  name: "test",
  async generate() { throw new Error("not used"); },
  async *stream(): AsyncIterable<StreamChunk> {
    const fullJson = '{"summary": "Good product", "sentiment": "positive", "score": 4}';
    const tokens = fullJson.match(/.{1,6}/g) ?? [];
    for (const token of tokens) {
      yield { type: "text-delta", textDelta: token };
    }
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 15, outputTokens: 25, totalTokens: 40 } };
  },
};

// Mock provider that emits an error mid-stream
const failingProvider: Provider = {
  name: "test",
  async generate() { throw new Error("not used"); },
  async *stream(): AsyncIterable<StreamChunk> {
    yield { type: "text-delta", textDelta: '{"bad":' };
    yield { type: "error", error: new Error("Provider stream failed") };
  },
};

const client = createClient({ provider: mockProvider });
const failingClient = createClient({ provider: failingProvider });

const schema = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "negative", "mixed"]),
  score: z.number(),
});

async function testAwaitOnlyObject() {
  console.log("=== TEST: awaiting only `object` does not crash on usage rejection ===");
  
  // This should NOT throw an unhandled rejection
  const { object } = streamObject(client, {
    model: "fake-model",
    schema,
    messages: [{ role: "user", content: "review this product" }],
  });
  
  const result = await object;
  check("object resolves with parsed data", result.summary === "Good product" && result.score === 4);
}

async function testAwaitOnlyUsage() {
  console.log("=== TEST: awaiting only `usage` does not crash on object rejection ===");
  
  const { usage } = streamObject(client, {
    model: "fake-model",
    schema,
    messages: [{ role: "user", content: "review this product" }],
  });
  
  const result = await usage;
  check("usage resolves with token counts", result.totalTokens === 40);
}

async function testNoUnhandledRejectionOnFailure() {
  console.log("=== TEST: no unhandledRejection when only object is awaited on failing provider ===");
  
  let unhandledRejection = false;
  const handler = (reason: unknown) => {
    unhandledRejection = true;
  };
  process.on("unhandledRejection", handler);
  
  const { object } = streamObject(failingClient, {
    model: "fake-model",
    schema,
    messages: [{ role: "user", content: "review this product" }],
  });
  
  // Let the event loop process the stream
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  // Don't await — just let it hang unhandled to verify no crash
  void object;
  
  // Wait a bit more for any potential unhandled rejection
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  process.off("unhandledRejection", handler);
  check("no unhandledRejection fired", !unhandledRejection);
}

async function testObjectRejectsOnFailure() {
  console.log("=== TEST: awaiting `object` on failing provider rejects with provider error ===");
  
  const { object } = streamObject(failingClient, {
    model: "fake-model",
    schema,
    messages: [{ role: "user", content: "review this product" }],
  });
  
  let caughtError: unknown = null;
  try {
    await object;
  } catch (err) {
    caughtError = err;
  }
  
  check("object rejects with provider error", caughtError instanceof Error && (caughtError as Error).message.includes("stream failed"));
}

async function main() {
  await testAwaitOnlyObject();
  await testAwaitOnlyUsage();
  await testNoUnhandledRejectionOnFailure();
  await testObjectRejectsOnFailure();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 streamObject deferred promises catch test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});