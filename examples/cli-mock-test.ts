import { execFileSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, symlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

console.log("=== TEST: `samai-sdk create` scaffolds a real, working project ===");

const repoRoot = process.cwd();
const workDir = join(repoRoot, "__cli_test_workspace");
const projectName = "test-agent";
const projectDir = join(workDir, projectName);

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

// Run the ACTUAL built CLI binary, the same way `npx samai-sdk create ...` would.
execFileSync("node", [join(repoRoot, "dist", "cli.js"), "create", projectName, "--provider", "groq"], {
  cwd: workDir,
  stdio: "pipe",
});

console.log(`  scaffolded project exists: ${existsSync(projectDir)}`);
if (!existsSync(projectDir)) throw new Error("CLI did not create the project directory");

const expectedFiles = ["package.json", "tsconfig.json", "src/index.ts", ".env.example", ".gitignore", "README.md"];
for (const file of expectedFiles) {
  const exists = existsSync(join(projectDir, file));
  console.log(`  ${file}: ${exists ? "present" : "MISSING"}`);
  if (!exists) throw new Error(`Expected scaffolded file missing: ${file}`);
}

const indexTs = readFileSync(join(projectDir, "src", "index.ts"), "utf8");
console.log(`  src/index.ts uses --provider groq: ${indexTs.includes('import { groq } from "samai-sdk"')}`);
if (!indexTs.includes('import { groq } from "samai-sdk"')) {
  throw new Error("--provider groq flag was not respected in the generated source");
}

const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
console.log(`  package.json name matches target dir: ${pkg.name === projectName}`);
if (pkg.name !== projectName) throw new Error("Scaffolded package.json name doesn't match the target directory");

// Regression: the scaffold must pin samai-sdk to a version that actually exists on
// npm (https://github.com/Sameer9823/samai-sdk issues — `^0.2.0` was never published,
// so `npm install` in the new project failed with ETARGET). Read the SDK's own
// package.json version and assert the scaffolded pin matches `^<that version>`.
const sdkPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const expectedVersion = `^${sdkPkg.version}`;
console.log(`  samai-sdk dependency pinned to ${pkg.dependencies["samai-sdk"]} (expected ${expectedVersion})`);
if (pkg.dependencies["samai-sdk"] !== expectedVersion) {
  throw new Error(`Scaffolded samai-sdk dependency is ${pkg.dependencies["samai-sdk"]}, expected ${expectedVersion}`);
}
// zod is used directly by the scaffolded source, and the provider SDK for the
// requested provider must be listed too (optional peers aren't auto-installed for
// downstream `npm install`). For --provider groq that's `openai`.
console.log(`  zod present in dependencies: ${typeof pkg.dependencies["zod"] === "string"}`);
if (typeof pkg.dependencies["zod"] !== "string") throw new Error("Scaffolded project is missing zod in dependencies");
console.log(`  openai provider SDK present for groq: ${typeof pkg.dependencies["openai"] === "string"}`);
if (typeof pkg.dependencies["openai"] !== "string") throw new Error("Scaffolded project is missing the openai provider SDK for --provider groq");

// Regression: scaffold README must point at the real repo (github.com/Sameer9823/samai-sdk),
// not the stale github.com/SamAI/samai-sdk org that 404s.
const readme = readFileSync(join(projectDir, "README.md"), "utf8");
console.log(`  README links to github.com/Sameer9823/samai-sdk: ${readme.includes("github.com/Sameer9823/samai-sdk")}`);
if (!readme.includes("github.com/Sameer9823/samai-sdk")) throw new Error("Scaffolded README still references the old github.com/SamAI/samai-sdk org");
if (readme.includes("github.com/SamAI/samai-sdk")) throw new Error("Scaffolded README still contains the stale github.com/SamAI/samai-sdk reference");

// Re-running create against the same directory should fail loudly, not silently overwrite.
let refusedDuplicate = false;
try {
  execFileSync("node", [join(repoRoot, "dist", "cli.js"), "create", projectName], { cwd: workDir, stdio: "pipe" });
} catch {
  refusedDuplicate = true;
}
console.log(`  refuses to overwrite an existing directory: ${refusedDuplicate}`);
if (!refusedDuplicate) throw new Error("CLI should have refused to scaffold into an already-existing directory");

// Typecheck the scaffolded project's own source against the REAL built package — proves the
// generated code isn't just plausible-looking text, it's valid TypeScript against the actual
// published type surface (dist/index.d.ts), not a hand-wavy string template.
mkdirSync(join(projectDir, "node_modules"), { recursive: true });
symlinkSync(repoRoot, join(projectDir, "node_modules", "samai-sdk"));
symlinkSync(join(repoRoot, "node_modules", "zod"), join(projectDir, "node_modules", "zod"));

execFileSync(
  "node",
  [
    require.resolve("typescript/bin/tsc"),
    "--noEmit",
    "--strict",
    "--target",
    "ES2022",
    "--module",
    "ESNext",
    "--moduleResolution",
    "Bundler",
    "--skipLibCheck",
    join(projectDir, "src", "index.ts"),
  ],
  { cwd: projectDir, stdio: "pipe" }
);
console.log("  scaffolded src/index.ts typechecks cleanly against the real, built SDK types: true");

rmSync(workDir, { recursive: true, force: true });
console.log("✅ TEST passed\n");
console.log("🎉 CLI scaffolding test passed");
