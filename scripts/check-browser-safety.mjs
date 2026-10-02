#!/usr/bin/env node
/**
 * Bundles the published `samai-sdk/voice` entry the way a browser bundler would, and fails if any
 * Node built-in sneaks in.
 *
 * Why this exists: 0.3.5's `voice` entry reached `node:crypto` (for `randomUUID`) and used `Buffer`
 * for audio, so a client bundle either failed to build (`Can't resolve 'fs'`) or threw
 * `Buffer is not defined` at runtime. The 0.3.6 fix moved both behind browser-safe helpers
 * (`src/bytes.ts`, `src/uuid.ts`), and this script is what keeps them from creeping back.
 *
 * Three independent checks:
 *   1. esbuild with `platform: "browser"` resolves the entry; Node built-ins are unresolvable there,
 *      so a `node:*` import is a hard build error.
 *   2. The esbuild metafile is scanned for any built-in module that slipped through as external.
 *   3. The emitted JavaScript is scanned for unguarded `Buffer` / `process` / `__dirname` usage.
 *
 * Run after `npm run build`.
 */
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VOICE_ENTRY = join(root, "dist", "voice", "index.js");

let esbuild;
try {
  esbuild = (await import("esbuild")).default;
} catch {
  console.error("check-browser-safety: esbuild is not installed. Run `npm install` first.");
  process.exit(1);
}

/** Node built-ins that must never appear in a client bundle. `node:*` prefixed forms are matched too. */
const BUILTINS = new Set(builtinModules.filter((m) => !m.startsWith("_")));

function isBuiltinSpecifier(specifier) {
  if (specifier.startsWith("node:")) return true;
  const bare = specifier.replace(/^node:/, "");
  // `fs/promises`, `util/types`, ... — compare the module root.
  return BUILTINS.has(bare) || BUILTINS.has(bare.split("/")[0]);
}

// ── 1 + 2: bundle for the browser and inspect the module graph ────────────────────────────────
const workdir = mkdtempSync(join(tmpdir(), "samai-voice-bundle-"));
const failures = [];

let result;
try {
  const entryPoint = join(workdir, "entry.js");
  // A consumer-shaped entry: `import { ... } from "samai-sdk/voice"`, pointed at the built output.
  writeFileSync(entryPoint, `export * from ${JSON.stringify(VOICE_ENTRY.replace(/\\/g, "/"))};\n`, "utf8");

  result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    metafile: true,
    logLevel: "silent",
    // Optional peers must stay out of the client bundle; if one is reachable from the voice entry
    // without the app configuring it, that is exactly the failure this script exists to catch.
    external: [],
  });
} catch (error) {
  rmSync(workdir, { recursive: true, force: true });
  const text = error?.errors?.map((e) => `  ${e.text}`).join("\n") ?? String(error);
  console.error("check-browser-safety: `samai-sdk/voice` failed to bundle for the browser.\n" + text);
  process.exit(1);
}

for (const [file, meta] of Object.entries(result.metafile.inputs)) {
  if (isBuiltinSpecifier(file.replace(/^.*node_modules\//, ""))) {
    failures.push(`Node built-in module reached the client bundle: ${file}`);
  }
  for (const importPath of Object.keys(meta.imports ?? {})) {
    if (isBuiltinSpecifier(importPath) || /^(node:)/.test(importPath)) {
      failures.push(`${file} imports Node built-in "${importPath}"`);
    }
  }
}

// ── 3: scan the emitted JavaScript for unguarded Node globals ───────────────────────────────────
const code = result.outputFiles[0].text;
const LINES = code.split("\n");

/** Matches `Buffer` as a standalone identifier (not `.buffer`, not `ArrayBuffer`, not a word). */
const BUFFER_IDENTIFIER = /(?<![.\w$])Buffer(?![\w$])/;
/**
 * Matches `process` as a standalone identifier that is not a local function call. A declaration like
 * `process(chunk) {` (the VoiceActivityDetector method) is a same-named local, not the Node global.
 */
const PROCESS_GLOBAL = /(?<![.\w$])process(?![\w$])(?!\s*\()/;

for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i];
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

  if (BUFFER_IDENTIFIER.test(line) && !/typeof\s+Buffer/.test(line)) {
    failures.push(`unguarded Buffer reference in the browser bundle: ${trimmed.slice(0, 120)}`);
  }
  if (PROCESS_GLOBAL.test(line) && !/typeof\s+process/.test(line)) {
    failures.push(`unguarded process reference in the browser bundle: ${trimmed.slice(0, 120)}`);
  }
  if (/(?<![.\w$])(__dirname|__filename|require\s*\(\s*["']node:)/.test(line)) {
    failures.push(`CommonJS Node global in the browser bundle: ${trimmed.slice(0, 120)}`);
  }
}

rmSync(workdir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error("check-browser-safety: `samai-sdk/voice` is not browser-safe:");
  for (const failure of [...new Set(failures)]) console.error(`  - ${failure}`);
  process.exit(1);
}

const kib = (result.outputFiles[0].contents.byteLength / 1024).toFixed(1);
console.log(`check-browser-safety: samai-sdk/voice bundles for the browser (${kib} KiB), no Node built-ins.`);
