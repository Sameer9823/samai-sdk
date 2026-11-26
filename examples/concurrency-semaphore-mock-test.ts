import { Semaphore } from "../src/resilience/concurrency.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.log(`  ❌ ${label}`); failures++; }
}

async function main() {
  console.log("=== TEST: semaphore hands the slot to a waiter; new acquire in same tick queues ===");

  const sem = new Semaphore(1);
  await sem.acquire(); // A holds the only slot (available -> 0)

  const order: string[] = [];
  const waiter = sem.acquire().then(() => order.push("waiter")); // queued

  // release() and a brand-new acquire() in the SAME tick:
  sem.release(); // should hand the slot directly to the waiter
  const newcomer = sem.acquire().then(() => order.push("newcomer"));

  // Flush microtasks so the waiter (handed the slot) runs.
  await Promise.resolve();
  await Promise.resolve();

  check("waiter got the slot first", order[0] === "waiter");
  check("newcomer is still queued (didn't steal the slot)", order.length === 1);

  // Free the waiter's slot -> newcomer proceeds.
  sem.release();
  await Promise.all([waiter, newcomer]);
  check("order is waiter then newcomer", order.join(",") === "waiter,newcomer");

  if (failures) {
    console.log(`\n❌ ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\n🎉 concurrency semaphore test passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});