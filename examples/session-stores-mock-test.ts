import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RedisSessionStore, SqliteSessionStore, FileSessionStore, createSession } from "../src/index.js";

// ===========================================================================
// TEST 1 — SqliteSessionStore against the REAL better-sqlite3 library
// (no mocking here: this hits an actual on-disk SQLite database)
// ===========================================================================
console.log("=== TEST 1: SqliteSessionStore persists across store instances ===");

const dbPath = "./__samai_test_sessions.db";
rmSync(dbPath, { force: true });

const sqliteStoreA = new SqliteSessionStore({ path: dbPath });
const sessionA = createSession("user-42", sqliteStoreA);

await sessionA.appendMessages([{ role: "user", content: "What's the capital of France?" }]);
await sessionA.appendMessages([{ role: "assistant", content: "Paris." }]);

// Open a brand-new store instance pointed at the same file, to prove it's really durable
// and not just in-process memory.
const sqliteStoreB = new SqliteSessionStore({ path: dbPath });
const sessionBSameId = createSession("user-42", sqliteStoreB);
const reloaded = await sessionBSameId.getMessages();

console.log(`  reloaded message count: ${reloaded.length} (expected 2)`);
if (reloaded.length !== 2) throw new Error("Expected 2 persisted messages after reopening the DB file");
if (reloaded[1].content !== "Paris.") throw new Error("Persisted content did not round-trip correctly");

const sessionBDifferentId = createSession("user-99", sqliteStoreB);
const isolated = await sessionBDifferentId.getMessages();
console.log(`  different session_id sees: ${isolated.length} messages (expected 0, proving isolation)`);
if (isolated.length !== 0) throw new Error("Sessions with different IDs must not see each other's messages");

await sessionA.clear();
const afterClear = await sqliteStoreB.getMessages("user-42");
console.log(`  after clear(): ${afterClear.length} messages (expected 0)`);
if (afterClear.length !== 0) throw new Error("clear() did not remove the session row");

try {
  rmSync(dbPath, { force: true });
} catch {
  // On some Windows versions, better-sqlite3 retains a handle briefly after all
  // store instances are dereferenced, causing EPERM. Retry after a short delay.
  await new Promise((resolve) => setTimeout(resolve, 100));
  try { rmSync(dbPath, { force: true }); } catch { /* best-effort cleanup */ }
}
console.log("✅ TEST 1 passed (real better-sqlite3, real file on disk)\n");

// ===========================================================================
// TEST 2 — RedisSessionStore's store logic (key prefixing, TTL, JSON round-trip),
// verified against a lightweight fake client satisfying the same minimal interface
// RedisSessionStore expects from ioredis. This sandbox has no live Redis server to
// connect to, so this test injects a client the same way a caller would inject their
// own already-connected ioredis instance via `new RedisSessionStore({ client })` —
// exactly the supported "bring your own client" path, not a reimplementation.
// ===========================================================================
console.log("=== TEST 2: RedisSessionStore key prefixing, TTL, and isolation ===");

class FakeRedisClient {
  lists = new Map<string, string[]>();
  expireCalls: { key: string; seconds: number }[] = [];

  async rpush(key: string, ...values: string[]): Promise<unknown> {
    const arr = this.lists.get(key) ?? [];
    arr.push(...values);
    this.lists.set(key, arr);
    return arr.length;
  }
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const arr = this.lists.get(key) ?? [];
    return stop === -1 ? arr.slice(start) : arr.slice(start, stop + 1);
  }
  async expire(key: string, seconds: number): Promise<unknown> {
    this.expireCalls.push({ key, seconds });
    return 1;
  }
  async del(key: string): Promise<unknown> {
    return this.lists.delete(key) ? 1 : 0;
  }
}

const fakeClient = new FakeRedisClient();
const redisStore = new RedisSessionStore({ client: fakeClient, keyPrefix: "samai:test:", ttlSeconds: 3600 });
const redisSession = createSession("room-1", redisStore);

await redisSession.appendMessages([{ role: "user", content: "hi" }]);
await redisSession.appendMessages([{ role: "assistant", content: "hello!" }]);

const storedKey = [...fakeClient.lists.keys()][0];
console.log(`  key used: "${storedKey}" (expected prefix "samai:test:")`);
if (storedKey !== "samai:test:room-1") throw new Error("keyPrefix was not applied correctly");

const lastExpire = fakeClient.expireCalls.at(-1)!;
console.log(`  TTL applied via EXPIRE on write: ${lastExpire.seconds === 3600} (expected true)`);
if (lastExpire.seconds !== 3600) throw new Error("ttlSeconds option did not translate to a Redis EXPIRE call");

const msgs = await redisSession.getMessages();
console.log(`  round-tripped message count: ${msgs.length} (expected 2)`);
if (msgs.length !== 2) throw new Error("Expected 2 messages to round-trip through the fake Redis store");

// Overlapping appends must not lose each other's messages (RPUSH per message).
await Promise.all([
  redisSession.appendMessages([{ role: "user", content: "concurrent-a" }]),
  redisSession.appendMessages([{ role: "user", content: "concurrent-b" }]),
]);
const afterConcurrent = await redisSession.getMessages();
console.log(`  after 2 concurrent appends: ${afterConcurrent.length} (expected 4)`);
if (afterConcurrent.length !== 4) throw new Error("Overlapping Redis appends lost messages");
if (!afterConcurrent.some((m) => m.content === "concurrent-a") || !afterConcurrent.some((m) => m.content === "concurrent-b")) {
  throw new Error("Overlapping Redis appends dropped a concurrent message");
}

await redisSession.clear();
const afterRedisClear = await redisStore.getMessages("room-1");
if (afterRedisClear.length !== 0) throw new Error("clear() did not remove the Redis key");

console.log("✅ TEST 2 passed\n");

// ===========================================================================
// TEST 3 — FileSessionStore serializes overlapping appends per session
// (in-process promise chain), so concurrent writes don't clobber each other.
// ===========================================================================
console.log("=== TEST 3: FileSessionStore overlapping appends don't lose messages ===");

const tempDir = mkdtempSync(join(tmpdir(), "samai-file-store-"));
try {
  const fileStore = new FileSessionStore(tempDir);
  const fileSession = createSession("s-overlap", fileStore);
  await Promise.all([
    fileSession.appendMessages([{ role: "user", content: "a" }]),
    fileSession.appendMessages([{ role: "user", content: "b" }]),
    fileSession.appendMessages([{ role: "user", content: "c" }]),
  ]);
  const fileMsgs = await fileSession.getMessages();
  console.log(`  file store message count after 3 concurrent appends: ${fileMsgs.length} (expected 3)`);
  if (fileMsgs.length !== 3) throw new Error("FileSessionStore lost messages under concurrent appends");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log("✅ TEST 3 passed\n");

console.log("🎉 All session-store tests passed");
