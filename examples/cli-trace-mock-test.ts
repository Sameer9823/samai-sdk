import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import http from "node:http";
import net from "node:net";
import os from "node:os";

const repoRoot = process.cwd();
const cliPath = join(repoRoot, "dist", "cli.js");

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      s.close(() => resolve(port));
    });
  });
}

function httpGet(host: string, port: number): Promise<{ status: number; body: string }> {
  return new Promise((resolveP, reject) => {
    const req = http.get(`http://${host}:${port}/`, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolveP({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.setTimeout(3000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function traceJson() {
  const now = Date.now();
  return JSON.stringify({
    runId: "trace-test",
    startedAt: now - 1000,
    finishedAt: now,
    agentPath: ["test-agent"],
    totalUsage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
    events: [
      { type: "run-started", runId: "trace-test", agentName: "test-agent", timestamp: now - 1000 },
      { type: "text-delta", textDelta: "hello trace", agentName: "test-agent", timestamp: now - 500 },
      { type: "run-completed", output: "hello trace", text: "hello trace", usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 }, timestamp: now },
    ],
  });
}

function findNonLoopbackIPv4(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

async function startTraceServer(tracePath: string, port: number) {
  const child = spawn(process.execPath, [cliPath, "trace", tracePath, "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function waitForServer(port: number, deadline: number): Promise<{ status: number; body: string } | null> {
  while (Date.now() < deadline) {
    try { return await httpGet("127.0.0.1", port); } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  return null;
}

async function runTraceTest(label: string, tracePath: string, port: number, expectNonLoopbackRefused: boolean) {
  console.log(`=== ${label} ===`);
  let failures = 0;
  const check = (lbl: string, cond: boolean) => {
    console.log(`  ${cond ? "✅" : "❌"} ${lbl}`);
    if (!cond) failures++;
  };

  if (!existsSync(cliPath)) throw new Error("dist/cli.js not built; run npm run build first");

  const child = await startTraceServer(tracePath, port);
  let stderr = "";
  child.stderr.on("data", (c) => { stderr += c.toString(); });
  const deadline = Date.now() + 8000;

  try {
    // Wait for loopback server to respond
    const got = await waitForServer(port, deadline);
    console.log("  stderr:", stderr.slice(0, 500));
    check("trace server responded on 127.0.0.1", !!got);
    check("trace server returns 200", got !== null && got.status === 200);
    check("served HTML embeds the traced text", got !== null && got.body.includes("hello trace"));

    // Item 8: verify it binds to 127.0.0.1 only (non-loopback refused)
    if (expectNonLoopbackRefused) {
      const nonLoopbackIP = findNonLoopbackIPv4();
      if (nonLoopbackIP) {
        let connected = false;
        try {
          await httpGet(nonLoopbackIP, port);
          connected = true;
        } catch (e) {
          // Expected: ECONNREFUSED
        }
        check("non-loopback connection refused (bound to 127.0.0.1, not 0.0.0.0)", !connected);
      } else {
        console.log("  ⚠️  No non-loopback IPv4 found; skipping bind-address check");
      }
    }

  } finally {
    child.kill("SIGTERM");
    await new Promise(r => child.on("exit", r));
  }

  return failures;
}

async function main() {
  if (!existsSync(cliPath)) throw new Error("dist/cli.js not built; run npm run build first");

  let totalFailures = 0;

  // Test 1: absolute trace file path (Item 9)
  const tmpDir = mkdtempSync(join(tmpdir(), "samai-trace-"));
  const absTracePath = resolve(tmpDir, "trace.json");
  writeFileSync(absTracePath, traceJson());
  const port1 = await freePort();
  totalFailures += await runTraceTest(
    "Item 9: absolute trace file path resolves correctly",
    absTracePath,
    port1,
    true // expect non-loopback refused (item 8)
  );
  rmSync(tmpDir, { recursive: true, force: true });

  // Test 2: relative trace file path from cwd (Item 9: path.resolve uses cwd for relative)
  const relTraceDir = join(process.cwd(), "__trace_test_rel");
  mkdirSync(relTraceDir, { recursive: true });
  const relTracePath = resolve(relTraceDir, "trace.json");
  writeFileSync(relTracePath, traceJson());
  const port2 = await freePort();
  totalFailures += await runTraceTest(
    "Item 9: relative trace file path resolves via cwd",
    relTracePath,
    port2,
    true
  );
  rmSync(relTraceDir, { recursive: true, force: true });

  if (totalFailures) {
    console.log(`\n❌ ${totalFailures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 cli trace tests passed (items 8 & 9)");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });