#!/usr/bin/env node
/**
 * Fails the build when any path advertised in package.json is missing from disk.
 *
 * Why this exists: 0.3.5 shipped an `exports` entry for "./react-voice" pointing at
 * `dist/voice/react/index.js`, but tsup emits `dist/voice/react.js` (the entry is `"voice/react"`,
 * not `"voice/react/index"`). The file never existed, so `import "samai-sdk/react-voice"` failed at
 * install/resolve time for every consumer — and nothing in the build noticed.
 *
 * Run after `npm run build` (it is part of `prepublishOnly`).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/**
 * Collects every filesystem target referenced by a value, descending through the whole `exports`
 * map. Keys are never filesystem targets (they are subpaths like "./voice" or conditions like
 * "import"), so any string starting with "./" is a path and is safe to check.
 */
function collectPaths(value, out) {
  if (typeof value === "string") {
    if (value.startsWith("./") || value.startsWith("dist/")) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectPaths(item, out);
  }
  return out;
}

const targets = new Set();
for (const field of ["main", "module", "types", "bin", "exports", "files"]) {
  collectPaths(pkg[field], []).forEach((path) => targets.add(path));
}

if (targets.size === 0) {
  console.error("check-exports: no manifest paths were found to verify — is package.json shaped as expected?");
  process.exit(1);
}

const missing = [];
for (const target of targets) {
  // `./package.json` is a real export and must exist; `dist` alone is a directory, so accept dirs too.
  const absolute = join(root, target.replace(/^\.\//, ""));
  if (!existsSync(absolute)) missing.push(target);
}

if (missing.length > 0) {
  console.error("package.json references paths that do not exist after the build:");
  for (const path of [...missing].sort()) console.error(`  - ${path}`);
  console.error("\nFix the entry name in tsup.config.ts or the path in package.json, then rebuild.");
  process.exit(1);
}

console.log(`check-exports: ${targets.size} manifest path(s) verified on disk.`);
