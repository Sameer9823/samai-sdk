// Runs every mock/usage test file in sequence, failing on the first error.
// Replaces the old `npm run a && npm run b && ...` chain in package.json.
import { spawnSync } from "node:child_process";

const files = [
  "agent-runtime-mock-test",
  "handoff-other-tools-mock-test",
  "guardrails-agent-output-mock-test",
  "pii-multipart-mock-test",
  "agent-structured-output-mock-test",
  "run-agent-metadata-mock-test",
  "reliability-mock-test",
  "resilience-tracing-mock-test",
  "session-stores-mock-test",
  "provider-conversion-mock-test",
  "rag-mock-test",
  "cli-mock-test",
  "cli-trace-mock-test",
  "checkpoint-resume-mock-test",
  "testing-utils-mock-test",
  "otel-export-mock-test",
  "trace-viewer-mock-test",
  "generate-object-mock-test",
  "generate-object-failure-test",
  "generate-object-batch-mock-test",
  "retry-test",
  "fallback-test",
  "stream-object-mock-test",
  "stream-object-deferred-mock-test",
  "usage-ledger-mock-test",
  "run-completed-ordering-mock-test",
  "run-output-guardrail-streaming-mock-test",
  "session-max-messages-mock-test",
  "tool-loop-guardrail-throw-mock-test",
  "mcp-connect-retry-mock-test",
  "concurrency-semaphore-mock-test",
  "vue-usage-mock-test",
  "svelte-usage-mock-test",
  "valibot-mock-test",
  "mcp-usage-test",
  "sandbox-usage-test",
  "sandbox-timeout-group-mock-test",
  "voice-usage-test",
  "graph-memory-mock-test",
  "graph-memory-cypher-guard-mock-test",
  "graph-memory-self-correction-mock-test",
  "graph-memory-self-correction-clean-mock-test",
  "graph-memory-feed-engine-mock-test",
  "graph-memory-admin-mock-test",
  "graph-memory-fact-lifecycle-mock-test",
  "graph-memory-metrics-mock-test",
  "graph-memory-manager-mock-test",
  "voice-pipeline-mock-test",
  "voice-interruption-mock-test",
  "voice-turn-taking-mock-test",
  "voice-goal-tracking-mock-test",
  "voice-clarification-mock-test",
  "voice-session-continuity-mock-test",
  "voice-tracing-mock-test",
  "voice-realtime-mock-test",
  "voice-realtime-ga-test",
  "voice-realtime-ws-toolcall-mock-test",
  "voice-webrtc-connection-test",
  "voice-missing-key-mock-test",
];

for (const name of files) {
  const file = `examples/${name}.ts`;
  const result = spawnSync(process.execPath, ["--import", "tsx", file], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n✖ Test failed: ${file}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\n🎉 All ${files.length} test files passed`);