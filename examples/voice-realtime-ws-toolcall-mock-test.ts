import { z } from "zod";
import { createRealtimeSession } from "../src/voice.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

// ---- Fake WebSocket ----
interface WSListener { (event: any): void; }

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static lastInstance: FakeWebSocket | null = null;

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  private listeners = new Map<string, Set<WSListener>>();

  constructor(public url: string, public protocols?: string | string[]) {
    FakeWebSocket.lastInstance = this;
    // Auto-open after a tick
    queueMicrotask(() => {
      if (this.readyState === FakeWebSocket.CONNECTING) {
        this.readyState = FakeWebSocket.OPEN;
        this.dispatch("open", {});
      }
    });
  }

  addEventListener(type: string, fn: WSListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: WSListener) {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type: string, event: any) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(event);
  }
  send(data: string) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error("WebSocket not open");
    this.sent.push(data);
    // Auto-respond to session.update with session.created
    try {
      const msg = JSON.parse(data);
      if (msg.type === "session.update") {
        queueMicrotask(() => {
          this.receive({ type: "session.created", session: { id: "sess-auto" } });
        });
      }
    } catch {}
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", {});
  }

  /** Deliver an incoming message as the server would. */
  receive(message: Record<string, unknown>) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error("WebSocket not open");
    this.dispatch("message", { data: JSON.stringify(message) });
  }
}

// Install fake global WebSocket
const originalWS = globalThis.WebSocket;
(globalThis as any).WebSocket = FakeWebSocket;

function restoreWS() {
  (globalThis as any).WebSocket = originalWS;
}

async function testApprovalFailClosed() {
  console.log("=== TEST: tool with requiresApproval fails closed without handler ===");
  const calls: any[] = [];

  const session = createRealtimeSession({
    apiKey: "test-key",
    model: "gpt-realtime",
    tools: [{
      name: "get_time",
      description: "Get current time",
      parameters: z.object({ timestamp: z.string() }),
      execute: async () => {
        calls.push({ tool: "get_time" });
        return "12:00 PM";
      },
      requiresApproval: true,
    }],
    // No onApprovalRequest - should fail closed
  });

  await session.connect();

  const ws = FakeWebSocket.lastInstance!;
  if (!ws) throw new Error("WebSocket not captured");

  // Send a function call event
  ws.receive({
    type: "response.function_call_arguments.done",
    name: "get_time",
    call_id: "call-1",
    arguments: JSON.stringify({ timestamp: "2024-01-01T12:00:00Z" }),
  });

  // Wait for the function call to be processed
  await new Promise(r => setTimeout(r, 100));

  // Check what was sent back - should be a function_call_output with error
  const outputMsgs = ws.sent
    .map(s => JSON.parse(s))
    .filter(m => m.type === "conversation.item.create" && m.item.type === "function_call_output");

  check("function_call_output was sent back", outputMsgs.length > 0);
  if (outputMsgs.length > 0) {
    const output = outputMsgs[0].item.output;
    check("output contains approval error (fail closed)", output.includes("approval") || output.includes("requires approval"));
    check("tool was NOT executed (fail closed)", calls.length === 0);
  }

  await session.close();
}

async function testApprovalAllowed() {
  console.log("=== TEST: tool with requiresApproval executes when approved ===");
  const calls: any[] = [];

  const session = createRealtimeSession({
    apiKey: "test-key",
    model: "gpt-realtime",
    tools: [{
      name: "get_time",
      description: "Get current time",
      parameters: z.object({ timestamp: z.string() }),
      execute: async () => {
        calls.push({ tool: "get_time" });
        return "12:00 PM";
      },
      requiresApproval: true,
    }],
    onApprovalRequest: async ({ toolName, args }) => {
      check("onApprovalRequest called with correct tool", toolName === "get_time");
      return true; // approve
    },
  });

  await session.connect();
  const ws = FakeWebSocket.lastInstance!;

  // Send a function call event
  ws.receive({
    type: "response.function_call_arguments.done",
    name: "get_time",
    call_id: "call-2",
    arguments: JSON.stringify({ timestamp: "2024-01-01T12:00:00Z" }),
  });

  await new Promise(r => setTimeout(r, 100));

  check("tool was executed (approved)", calls.length === 1);
  check("call has expected tool name", calls[0]?.tool === "get_time");

  // Verify function_call_output was sent with the result
  const outputMsgs = ws.sent
    .map(s => JSON.parse(s))
    .filter(m => m.type === "conversation.item.create" && m.item.type === "function_call_output");
  check("function_call_output sent with result", outputMsgs.length > 0);
  if (outputMsgs.length > 0) {
    check("output contains the tool result", outputMsgs[0].item.output.includes("12:00 PM"));
  }

  await session.close();
}

async function testZodValidation() {
  console.log("=== TEST: zod validation rejects invalid args ===");

  const session = createRealtimeSession({
    apiKey: "test-key",
    model: "gpt-realtime",
    tools: [{
      name: "get_weather",
      description: "Get weather",
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => `sunny in ${city}`,
    }],
  });

  await session.connect();
  const ws = FakeWebSocket.lastInstance!;

  // Send function call with MISSING required arg
  ws.receive({
    type: "response.function_call_arguments.done",
    name: "get_weather",
    call_id: "call-3",
    arguments: "{}", // missing required "city"
  });

  await new Promise(r => setTimeout(r, 100));

  // Should send back function_call_output with validation error
  const outputMsgs = ws.sent
    .map(s => JSON.parse(s))
    .filter(m => m.type === "conversation.item.create" && m.item.type === "function_call_output");
  check("function_call_output sent for validation error", outputMsgs.length > 0);
  if (outputMsgs.length > 0) {
    const output = outputMsgs[0].item.output;
    check("output contains validation error", output.includes("city") || output.includes("required"));
  }

  await session.close();
}

async function testMalformedJsonArgs() {
  console.log("=== TEST: malformed arguments JSON does not crash, emits error output ===");

  const session = createRealtimeSession({
    apiKey: "test-key",
    model: "gpt-realtime",
    tools: [{
      name: "get_time",
      description: "Get current time",
      parameters: z.object({}),
      execute: async () => "12:00 PM",
    }],
  });

  await session.connect();
  const ws = FakeWebSocket.lastInstance!;

  // Send malformed JSON arguments
  ws.receive({
    type: "response.function_call_arguments.done",
    name: "get_time",
    call_id: "call-malformed",
    arguments: "{not json",
  });

  // Wait for async processing
  await new Promise(r => setTimeout(r, 100));

  // Should send back function_call_output with error (not crash, not throw unhandled)
  const outputMsgs = ws.sent
    .map(s => JSON.parse(s))
    .filter(m => m.type === "conversation.item.create" && m.item.type === "function_call_output");
  check("function_call_output was sent despite malformed args", outputMsgs.length > 0);
  if (outputMsgs.length > 0) {
    check("output indicates invalid JSON", outputMsgs[0].item.output.includes("Invalid tool arguments JSON"));
  }

  // Also verify response.create was sent to continue the conversation
  const responseCreateMsgs = ws.sent
    .map(s => JSON.parse(s))
    .filter(m => m.type === "response.create");
  check("response.create was sent to continue", responseCreateMsgs.length > 0);

  await session.close();
}

async function main() {
  await testApprovalFailClosed();
  await testApprovalAllowed();
  await testZodValidation();
  await testMalformedJsonArgs();

  restoreWS();

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 voice realtime websocket toolcall tests passed");
}

main().catch((err) => {
  restoreWS();
  console.error("FAIL:", err);
  process.exit(1);
});